import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  extractIdentifiers,
  checkIdentifiersInDatabase,
  type DatabaseMatch,
} from "../databaze/_lib/crossReference";
import { checkRateLimit, hashForRL } from "../_lib/ratelimit";
import { runAnalysis } from "../_lib/aiAnalysis";

let _supabaseAdmin: ReturnType<typeof createClient<any>> | null = null;
function supabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

export const dynamic = "force-dynamic";

async function handleAnonymousAnalysis(req: Request, text: string) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Redis preliminary check — rychlý cross-instance guard před DB dotazem.
  // fail-open: pokud Redis nedostupný, pokračuje na DB check níže.
  const ipHash = await hashForRL(ip);
  const rl = await checkRateLimit(ipHash, 'analyze:anon', 2, '24 h', true);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Denní limit",
        message: "Denní limit 2 kontrol vyčerpán. Zaregistrujte se pro více analýz.",
        limitReached: true,
      },
      { status: 429 }
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: ipRecord } = await supabaseAdmin()
    .from("anonymous_usage")
    .select("count")
    .eq("ip_address", ip)
    .eq("date", today)
    .single();

  const currentCount = ipRecord?.count ?? 0;
  const ANON_DAILY_LIMIT = 2;

  if (currentCount >= ANON_DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: "Denní limit",
        message: `Denní limit ${ANON_DAILY_LIMIT} kontrol vyčerpán. Zaregistrujte se pro více analýz.`,
        limitReached: true,
      },
      { status: 429 }
    );
  }

  const result = await runAnalysis(text, "free");
  await supabaseAdmin().rpc("upsert_anonymous_usage", { p_ip: ip, p_date: today });
  const shareId = await saveResult(null, text, result, "free");
  void (async () => { try { await supabaseAdmin().rpc("increment_total_analyses"); } catch {} })();

  const database_matches = await runCrossReference(text);

  return NextResponse.json({
    ...result,
    shareId,
    database_matches,
    remainingChecks: ANON_DAILY_LIMIT - currentCount - 1,
    tier: "free",
  });
}

async function runCrossReference(text: string | null | undefined): Promise<DatabaseMatch[]> {
  if (!text || typeof text !== "string") return [];
  try {
    const identifiers = extractIdentifiers(text);
    if (identifiers.length === 0) return [];
    return await checkIdentifiersInDatabase(supabaseAdmin() as any, identifiers);
  } catch (err) {
    console.warn("Cross-reference failed:", err);
    return [];
  }
}

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    // Akceptujeme buď `images: string[]` (multi-screenshot) nebo `image: string`
    // (legacy single-shot). Normalizujeme na pole.
    const rawImages: unknown[] = Array.isArray(body?.images)
      ? body.images
      : typeof body?.image === "string"
        ? [body.image]
        : [];
    const images: string[] = [];
    for (const item of rawImages) {
      if (typeof item === "string" && item.length > 0) images.push(item);
    }

    if (images.length === 0 && (!text || text.trim().length < 3)) {
      return NextResponse.json({ error: "Zadejte text nebo nahrajte obrázek ke kontrole." }, { status: 400 });
    }

    if (images.length === 0 && text && text.length > 5000) {
      return NextResponse.json({ error: "Text je příliš dlouhý. Maximum je 5000 znaků." }, { status: 400 });
    }

    if (images.length > MAX_IMAGES) {
      return NextResponse.json({ error: `Maximum ${MAX_IMAGES} obrázků na jednu analýzu.` }, { status: 400 });
    }

    for (const img of images) {
      const base64Data = img.split(",")[1] ?? img;
      if (Math.ceil(base64Data.length * 0.75) > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Některý obrázek je příliš velký. Maximum jsou 4 MB na obrázek." }, { status: 400 });
      }
    }
    const hasImages = images.length > 0;

    // ── PŘIHLÁŠENÝ UŽIVATEL — zkus cookies i Bearer token ─────────────────
    let userId: string | null = null;

    // Metoda 1: cookies (spolehlivější)
    try {
      const cookieStore = await cookies();
      const supabaseCookies = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return cookieStore.getAll(); },
            setAll() {},
          },
        }
      );
      const { data: { user } } = await supabaseCookies.auth.getUser();
      if (user) userId = user.id;
    } catch (e) { console.warn("Cookie auth failed:", e); }

    // Metoda 2: Bearer token jako fallback
    if (!userId) {
      const auth = req.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (token) {
        const { data: { user } } = await supabaseAdmin().auth.getUser(token);
        if (user) userId = user.id;
      }
    }

    // ── FALLBACK NA ANONYMNÍ REŽIM ─────────────────────────────────────────
    if (!userId) {
      if (hasImages) {
        return NextResponse.json({
          error: "Pro analýzu obrázků se musíte přihlásit a mít tarif BASIC nebo PRO.",
          upgradeRequired: true,
        }, { status: 403 });
      }
      return handleAnonymousAnalysis(req, text);
    }

    const { data: profile, error: profileErr } = await supabaseAdmin()
      .from("user_profiles")
      .select("tier")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profil nenalezen. Kontaktujte podporu." }, { status: 404 });
    }

    const tier = profile.tier || "free";

    if (hasImages && !["basic", "pro", "oneshot", "easy"].includes(tier)) {
      return NextResponse.json({
        error: "Analýza obrázků je dostupná pouze pro tarif BASIC a PRO.",
        upgradeRequired: true,
      }, { status: 403 });
    }

    // Atomically check-and-deduct in one DB operation.
    // deduct_credit returns the new credits_remaining, or NULL if the user had 0 credits.
    const { data: newCredits, error: deductErr } = await supabaseAdmin().rpc(
      "deduct_credit",
      { p_user_id: userId }
    );

    if (deductErr) {
      return NextResponse.json({ error: "Nepodařilo se odečíst kredit. Zkuste to znovu." }, { status: 500 });
    }

    if (newCredits === null || newCredits === undefined) {
      return NextResponse.json(
        {
          error: "Nedostatek analýz",
          message: tier === "free"
            ? "Nemáte žádné analýzy. Kupte si balíček."
            : "Vyčerpali jste všechny analýzy. Kupte si nový balíček.",
          credits: 0,
          tier,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    const result = await runAnalysis(text ?? null, tier, images);
    const shareId = await saveResult(
      userId,
      hasImages ? `[Analýza ${images.length > 1 ? images.length + " obrázků" : "obrázku"}]` : text,
      result,
      tier,
    );

    void (async () => { try { await supabaseAdmin().rpc("increment_total_analyses"); } catch {} })();

    const database_matches = await runCrossReference(text ?? null);

    return NextResponse.json({
      ...result,
      shareId,
      database_matches,
      credits: newCredits,
      tier,
    });

  } catch (err: any) {
    console.warn("Analyze error:", err);
    const msg = String(err?.message ?? '').toLowerCase();
    const isAiUnavailable =
      err?.status === 429 ||
      (err?.status >= 500) ||
      msg.includes('rate limit') ||
      msg.includes('timeout') ||
      msg.includes('overloaded');
    if (isAiUnavailable) {
      return NextResponse.json(
        {
          error: "Naše AI je momentálně přetížená. Zkuste to prosím za chvíli — nebo mezitím využijte vyhledávání v databázi, které funguje i teď.",
          aiUnavailable: true,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Chyba serveru. Zkuste to znovu." }, { status: 500 });
  }
}

async function saveResult(userId: string | null, text: string, result: any, tier: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin()
      .from("shared_results")
      .insert({
        original_text:  text,
        risk:           result.risk,
        verdict:        result.verdict,
        analysis:       result.analysis,
        threats:        result.threats ?? [],
        recommendation: result.recommendation,
        tier,
        created_at:     new Date().toISOString(),
      })
      .select("id")
      .single();
    return data?.id || null;
  } catch (e) {
    console.warn("Failed to save result:", e);
    return null;
  }
}