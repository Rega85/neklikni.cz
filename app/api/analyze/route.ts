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

    const { text, imageUrl } = await req.json();
    if (!text?.trim() && !imageUrl) {
      return NextResponse.json({ error: "Chybí vstup" }, { status: 400 });
    }

    const tier = (profile.tier || "free").toLowerCase();
    const isPro = tier === "pro" || tier === "elite";
    const model = isPro ? "claude-opus-4-6" : "claude-haiku-4-5-20251001";

    let userContent: any[] = [];

    // ✅ VISION LOGIKA: Pokud je tam URL obrázku, stáhneme ho a pošleme Claudovi
    if (imageUrl) {
      const imageRes = await fetch(imageUrl);
      const arrayBuffer = await imageRes.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      const mediaType = imageRes.headers.get('content-type') || 'image/jpeg';

      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType as any, data: base64Image },
      });
      userContent.push({
        type: "text",
        text: "Analyzuj tento screenshot. Je na něm podvod?"
      });
    } else {
      userContent.push({ type: "text", text: `Analyzuj tuto zprávu: "${text}"` });
    }

    const systemPrompt = isPro
      ? `Jsi elitní expert na kyberbezpečnost. ${TRUSTED_DOMAINS}
        Vrať POUZE validní JSON:
        {
          "risk": 0-100,
          "verdict": "Max 15 slov.",
          "analysis": "Hloubkový rozbor (3-4 věty).",
          "threats": ["seznam hrozeb"],
          "recommendation": "Kroky (2-3 věty)."
        }`
      : `Jsi expert na kyberbezpečnost. Vrať POUZE JSON: {"risk": 0-100, "verdict": "Stručné."} ${TRUSTED_DOMAINS}`;

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    });

    // ✅ PARSOVÁNÍ JSONU (Pojištěno proti "kecům" okolo)
    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    let aiData: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      aiData = JSON.parse(match ? match[0] : raw);
    } catch {
      aiData = { risk: 50, verdict: "Analýza proběhla." };
    }

    // ✅ DATABÁZOVÁ MAGIE: Odečtení kreditu + Globální počítadlo
    const newCredits = profile.credits_remaining - 1;
    
    await Promise.all([
      supabase.from("user_profiles").update({ credits_remaining: newCredits }).eq("id", user.id),
      supabase.rpc('increment_total_analyses') // Volá SQL funkci, co jsme dělali minule
    ]);

    return NextResponse.json({
      risk: aiData.risk ?? 50,
      verdict: aiData.verdict ?? "",
      isLocked: !isPro,
      newCredits, // Posíláme nové kredity pro okamžitý update v UI
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