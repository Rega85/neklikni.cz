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

    if (!profile || profile.credits_remaining <= 0) {
      return NextResponse.json({ error: "Kredity vyčerpány" }, { status: 402 });
    }

    const { text } = await req.json();
    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [{ role: "user", content: `Analyzuj scam: "${text}". Formát JSON: {"risk": 0-100, "verdict": "vysvětlení"}` }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : "";
    let aiData: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      aiData = JSON.parse(match ? match[0] : raw);
    } catch {
      aiData = { risk: 50, verdict: "Analýza proběhla." };
    }

    // ODEČTENÍ KREDITU
    await supabase.from("user_profiles").update({ credits_remaining: profile.credits_remaining - 1 }).eq("id", user.id);

    // ✅ SHAPE RESPONSE PODLE TIERU
    const tier = (profile.tier || "free").toLowerCase();
    const response = {
      risk: aiData.risk ?? 50,
      verdict: tier === "free" ? "" : aiData.verdict,
      meta: {
        tier: tier,
        locked: tier === "free"
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}