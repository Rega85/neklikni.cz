import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TRUSTED_DOMAINS = `
DŮLEŽITÉ – tyto domény jsou 100% legitimní, nikdy nejsou podvod (risk max 5):
- stripe.com, checkout.stripe.com, billing.stripe.com
- supabase.com, supabase.io
- vercel.com, vercel.app
- google.com, gmail.com, youtube.com
- apple.com, microsoft.com, amazon.com
- neklikni.cz
- seznam.cz, idnes.cz, novinky.cz
`;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("credits_remaining, tier")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits_remaining <= 0) {
      return NextResponse.json({ 
        risk: "LIMIT", 
        verdict: "Kredity vyčerpány. Přejdi na vyšší tarif." 
      }, { status: 402 });
    }

    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "Chybí text" }, { status: 400 });
    }

    const tier = (profile.tier || "free").toLowerCase();
    const isPro = tier === "pro" || tier === "elite";
    const model = isPro ? "claude-opus-4-6" : "claude-haiku-4-5-20251001";

    const systemPrompt = isPro
      ? `Jsi elitní expert na kyberbezpečnost a psychologii podvodů.
${TRUSTED_DOMAINS}
Analyzuj zprávu a vrať POUZE validní JSON bez jakéhokoliv textu navíc:
{
  "risk": 0-100,
  "verdict": "Extrémně stručné shrnutí max 15 slov.",
  "analysis": "Hloubkový rozbor textu, tónu a skrytých hrozeb. 3-4 věty.",
  "threats": ["konkrétní detekovaná hrozba 1", "hrozba 2"],
  "recommendation": "Jasné kroky co má uživatel udělat. 2-3 věty."
}`
      : `Jsi expert na kyberbezpečnost. Analyzuj zprávu a vrať POUZE validní JSON:
{"risk": 0-100, "verdict": "Stručné vyhodnocení max 2 věty."}
${TRUSTED_DOMAINS}`;

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: text }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    let aiData: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      aiData = JSON.parse(match ? match[0] : raw);
    } catch {
      aiData = { risk: 50, verdict: "Analýza proběhla." };
    }

    await supabase
      .from("user_profiles")
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq("id", user.id);

    return NextResponse.json({
      risk: aiData.risk ?? 50,
      verdict: tier === "free" ? "" : (aiData.verdict ?? ""),
      isLocked: tier === "free",
      ...(isPro && {
        analysis: aiData.analysis ?? null,
        threats: aiData.threats ?? [],
        recommendation: aiData.recommendation ?? null,
      }),
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}