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
      return NextResponse.json({ risk: "LIMIT", verdict: "Kredity vyčerpány." }, { status: 402 });
    }

    const { text, imageUrl } = await req.json();
    const tier = (profile.tier || "free").toLowerCase();
    const isPro = tier === "pro" || tier === "elite";
    const model = isPro ? "claude-opus-4-6" : "claude-haiku-4-5-20251001";

    let userContent: any[] = [];
    if (imageUrl) {
      const imageRes = await fetch(imageUrl);
      const arrayBuffer = await imageRes.arrayBuffer();
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: Buffer.from(arrayBuffer).toString('base64') },
      });
      userContent.push({ type: "text", text: "Analyzuj tento screenshot. Je to phishing?" });
    } else {
      userContent.push({ type: "text", text: `Analyzuj: "${text}"` });
    }

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: `Vrať POUZE JSON: {"risk": 0-100, "verdict": "...", "analysis": "...", "threats": [], "recommendation": "..."}`,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    const aiData = JSON.parse(match ? match[0] : raw);

    // ✅ TIŠŠÍ ZÁPIS: I když databáze selže, uživatel dostane výsledek
    try {
      await supabase.from("user_profiles").update({ credits_remaining: profile.credits_remaining - 1 }).eq("id", user.id);
      await supabase.rpc('increment_total_analyses');
    } catch (dbErr) {
      console.error("DB Update failed, but continuing...", dbErr);
    }

    return NextResponse.json({
      ...aiData,
      isLocked: !isPro,
      newCredits: profile.credits_remaining - 1
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}