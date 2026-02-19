import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    // 🛑 OPRAVA: Frontend při !response.ok čeká JSON s klíčem "error"
    if (!profile || profile.credits_remaining <= 0) {
      return NextResponse.json({ 
        error: "Kredity vyčerpány. Přejdi na vyšší tarif pro další analýzy." 
      }, { status: 402 });
    }

    const { text } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "Chybí text k analýze." }, { status: 400 });
    }

    const tier = (profile.tier || "free").toLowerCase();
    const isPro = tier === "pro" || tier === "elite";

    // 🧠 Model Routing: PRO platí, PRO dostane Sonnet
    const model = isPro ? "claude-sonnet-4-5-20250929" : "claude-haiku-4-5-20251001";
    
    const systemPrompt = isPro
      ? 'Jsi elitní expert na kyberbezpečnost. Vrať POUZE validní JSON: {"risk": 0-100, "verdict": "Popiš taktiky manipulace + 2 konkrétní kroky co dělat. Max 5 vět."}'
      : 'Jsi expert na kyberbezpečnost. Vrať POUZE validní JSON: {"risk": 0-100, "verdict": "Stručně (max 2 věty) proč je to bezpečné/podvod."}';

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
      aiData = { risk: 50, verdict: "Analýza proběhla, ale data jsou poškozená." };
    }

    // 💸 Odečti kredit
    await supabase
      .from("user_profiles")
      .update({ credits_remaining: profile.credits_remaining - 1 })
      .eq("id", user.id);

    // ✅ isLocked – Sladěno s frontendem přesně podle tvého návrhu
    return NextResponse.json({
      risk: aiData.risk ?? 50,
      verdict: tier === "free" ? "" : (aiData.verdict ?? ""),
      isLocked: tier === "free",
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Kritická chyba serveru." }, { status: 500 });
  }
}