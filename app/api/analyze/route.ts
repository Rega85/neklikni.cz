import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";
import {
  extractIdentifiers,
  checkIdentifiersInDatabase,
  type DatabaseMatch,
} from "../databaze/_lib/crossReference";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

const TIER_MODELS: Record<string, string> = {
  free:    "claude-haiku-4-5-20251001",
  easy:    "claude-opus-4-5",     // legacy alias for oneshot
  oneshot: "claude-opus-4-5",     // 49 Kč one-time premium analysis
  basic:   "claude-sonnet-4-5",
  pro:     "claude-opus-4-5",
};

const SYSTEM_PROMPT_FREE = `Jsi expert na kybernetickou bezpečnost a phishing. 
Analyzuj zprávu a vrať POUZE validní JSON bez markdown bloků:
{
  "risk": číslo 0-100,
  "verdict": "krátký verdikt česky",
  "analysis": "stručná analýza česky (2-3 věty)",
  "threats": ["hrozba1", "hrozba2"],
  "recommendation": "doporučení česky"
}
DŮLEŽITÉ: Vždy odpovídej pouze v češtině s latinkou. Nikdy nepoužívej cyrilici, azbuku ani jiné nelatinkové znaky.`;

const SYSTEM_PROMPT_PRO = `Jsi expert na kybernetickou bezpečnost a phishing s hlubokými znalostmi sociálního inženýrství.
Analyzuj zprávu detailně a vrať POUZE validní JSON bez markdown bloků:
{
  "risk": číslo 0-100,
  "verdict": "verdikt česky",
  "analysis": "detailní analýza česky (4-6 vět)",
  "threats": ["hrozba1", "hrozba2", "hrozba3"],
  "tactics": ["taktika útočníka 1", "taktika útočníka 2"],
  "recommendation": "konkrétní doporučení česky",
  "details": {
    "sender_analysis": "analýza odesílatele",
    "urgency_indicators": ["indikátor naléhavosti"],
    "technical_indicators": ["technický indikátor"]
  }
}
DŮLEŽITÉ: Vždy odpovídej pouze v češtině s latinkou. Nikdy nepoužívej cyrilici, azbuku ani jiné nelatinkové znaky.`;

export const dynamic = "force-dynamic";

async function handleAnonymousAnalysis(req: Request, text: string) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

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
    if (err?.status === 429 || err?.message?.includes("rate limit")) {
      return NextResponse.json({ error: "AI služba je přetížena. Zkuste to za chvíli." }, { status: 503 });
    }
    return NextResponse.json({ error: "Chyba serveru. Zkuste to znovu." }, { status: 500 });
  }
}

// Cyrillic-to-Latin lookalike map (covers the most common confusables)
const CYRILLIC_MAP: Record<string, string> = {
  "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "І": "I",
  "К": "K", "М": "M", "О": "O", "Р": "P", "Т": "T", "Х": "X",
  "а": "a", "с": "c", "е": "e", "і": "i", "о": "o", "р": "p", "х": "x",
  "И": "N", "Ѕ": "S", "ѕ": "s",
};
const CYRILLIC_RE = new RegExp(Object.keys(CYRILLIC_MAP).join("|"), "g");

function decyrillize(s: string): string {
  return s.replace(CYRILLIC_RE, (ch) => CYRILLIC_MAP[ch] ?? ch);
}

function sanitizeCyrillic(data: any): any {
  if (typeof data === "string") return decyrillize(data);
  if (Array.isArray(data)) return data.map(sanitizeCyrillic);
  if (data && typeof data === "object") {
    const out: any = {};
    for (const k of Object.keys(data)) out[k] = sanitizeCyrillic(data[k]);
    return out;
  }
  return data;
}

function extractJson(raw: string): any {
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();

  // Try direct parse first
  try { return JSON.parse(stripped); } catch {}

  // Walk the string finding balanced {} blocks and try each one
  let depth = 0;
  let start = -1;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (stripped[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(stripped.slice(start, i + 1)); } catch {}
        start = -1;
      }
    }
  }

  throw new Error("AI nevrátila validní JSON");
}

async function runAnalysis(text: string | null, tier: string, images: string[] = []) {
  const model = TIER_MODELS[tier] || TIER_MODELS.free;
  const systemPrompt = ["pro", "easy"].includes(tier) ? SYSTEM_PROMPT_PRO : SYSTEM_PROMPT_FREE;
  const maxTokens = ["pro", "easy"].includes(tier) ? 2000 : tier === "basic" ? 1500 : 800;

  let userContent: any;
  if (images.length > 0) {
    const imageBlocks = images.map((b64) => {
      const match = b64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      const mediaType = (match?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";
      const data = match?.[2] ?? b64;
      return { type: "image", source: { type: "base64", media_type: mediaType, data } };
    });
    const instructionText =
      images.length === 1
        ? "Nejdříve extrahuj veškerý text z tohoto obrázku, poté ho analyzuj na phishing/podvodné indikátory. Odpověz ve stejném JSON formátu."
        : `Toto je ${images.length} screenshotů jedné zprávy nebo konverzace (rozdělené napříč více obrázky). Posuď je jako JEDEN celek: extrahuj veškerý text ze všech screenshotů, slož ho dohromady v pořadí ${images.length} obrázků a analyzuj výsledný celek na phishing/podvodné indikátory. Odpověz ve stejném JSON formátu.`;
    userContent = [
      ...imageBlocks,
      { type: "text", text: instructionText },
    ];
  } else {
    userContent = `Analyzuj tuto zprávu/odkaz na phishing a podvody:\n\n${text}`;
  }

  const msg = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  const aiData = sanitizeCyrillic(extractJson(raw));
  if (typeof aiData.risk !== "number" || !aiData.verdict) throw new Error("Neúplná AI odpověď");

  return aiData;
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