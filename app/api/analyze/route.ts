import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIER_MODELS: Record<string, string> = {
  free:  "claude-haiku-4-5-20251001",
  easy:  "claude-haiku-4-5-20251001",
  basic: "claude-sonnet-4-5",
  pro:   "claude-opus-4-5",
};

const SYSTEM_PROMPT_FREE = `Jsi expert na kybernetickou bezpečnost a phishing. 
Analyzuj zprávu a vrať POUZE validní JSON bez markdown bloků:
{
  "risk": číslo 0-100,
  "verdict": "krátký verdikt česky",
  "analysis": "stručná analýza česky (2-3 věty)",
  "threats": ["hrozba1", "hrozba2"],
  "recommendation": "doporučení česky"
}`;

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
}`;

export const dynamic = "force-dynamic";

async function handleAnonymousAnalysis(req: Request, text: string) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const today = new Date().toISOString().split("T")[0];
  const { data: ipRecord } = await supabaseAdmin
    .from("anonymous_usage")
    .select("count")
    .eq("ip_address", ip)
    .eq("date", today)
    .single();

  const currentCount = ipRecord?.count ?? 0;
  const ANON_DAILY_LIMIT = 3;

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
  await supabaseAdmin.rpc("upsert_anonymous_usage", { p_ip: ip, p_date: today });
  const shareId = await saveResult(null, text, result, "free");
  void (async () => { try { await supabaseAdmin.rpc("increment_total_analyses"); } catch {} })();

  return NextResponse.json({
    ...result,
    shareId,
    remainingChecks: ANON_DAILY_LIMIT - currentCount - 1,
    tier: "free",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || text.trim().length < 3) {
      return NextResponse.json({ error: "Zadejte text ke kontrole." }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: "Text je příliš dlouhý. Maximum je 5000 znaků." }, { status: 400 });
    }

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
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) userId = user.id;
      }
    }

    // ── FALLBACK NA ANONYMNÍ REŽIM ─────────────────────────────────────────
    if (!userId) {
      return handleAnonymousAnalysis(req, text);
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .select("tier")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profil nenalezen. Kontaktujte podporu." }, { status: 404 });
    }

    const tier = profile.tier || "free";

    // Atomically check-and-deduct in one DB operation.
    // deduct_credit returns the new credits_remaining, or NULL if the user had 0 credits.
    const { data: newCredits, error: deductErr } = await supabaseAdmin.rpc(
      "deduct_credit",
      { p_user_id: userId }
    );

    if (deductErr) {
      console.error("Credit deduction failed:", deductErr);
      return NextResponse.json({ error: "Nepodařilo se odečíst kredit. Zkuste to znovu." }, { status: 500 });
    }

    if (newCredits === null || newCredits === undefined) {
      return NextResponse.json(
        {
          error: "Nedostatek kreditů",
          message: tier === "free"
            ? "Nemáte žádné kredity. Kupte si balíček."
            : "Vyčerpali jste všechny kredity. Kupte si nový balíček.",
          credits: 0,
          tier,
          upgradeRequired: true,
        },
        { status: 402 }
      );
    }

    const result = await runAnalysis(text, tier);
    const shareId = await saveResult(userId, text, result, tier);

    void (async () => { try { await supabaseAdmin.rpc("increment_total_analyses"); } catch {} })();

    return NextResponse.json({
      ...result,
      shareId,
      credits: newCredits,
      tier,
    });

  } catch (err: any) {
    console.error("Analyze error:", err);
    if (err?.status === 429 || err?.message?.includes("rate limit")) {
      return NextResponse.json({ error: "AI služba je přetížena. Zkuste to za chvíli." }, { status: 503 });
    }
    return NextResponse.json({ error: "Chyba serveru. Zkuste to znovu." }, { status: 500 });
  }
}

async function runAnalysis(text: string, tier: string) {
  const model = TIER_MODELS[tier] || TIER_MODELS.free;
  const systemPrompt = tier === "pro" ? SYSTEM_PROMPT_PRO : SYSTEM_PROMPT_FREE;
  const maxTokens = tier === "pro" ? 2000 : tier === "basic" ? 1500 : 800;

  const msg = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: `Analyzuj tuto zprávu/odkaz na phishing a podvody:\n\n${text}` }],
  });

  const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI nevrátila validní JSON");

  const aiData = JSON.parse(jsonMatch[0]);
  if (typeof aiData.risk !== "number" || !aiData.verdict) throw new Error("Neúplná AI odpověď");

  return aiData;
}

async function saveResult(userId: string | null, text: string, result: any, tier: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin
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
    console.error("Failed to save result:", e);
    return null;
  }
}