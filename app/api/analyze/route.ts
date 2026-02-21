import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("credits_remaining, tier")
      .eq("id", user.id)
      .single();

    // --- KLÍČOVÝ FIX: Kontrola Tieru ---
    const tier = (profile?.tier || "free").toLowerCase();
    const isPro = tier === "pro" || tier === "elite";
    const hasCredits = (profile?.credits_remaining || 0) > 0;

    // Pokud není PRO a zároveň nemá kredity, teprve pak ho vyhodíme
    if (!isPro && !hasCredits) {
      return NextResponse.json({ risk: "LIMIT", verdict: "Kredity vyčerpány." }, { status: 402 });
    }

    const { text, imageUrl } = await req.json();
    const model = isPro ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001";

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

    // Kredity odečítáme, jen pokud uživatel není PRO
    try {
      if (!isPro && profile) {
        await supabase.from("user_profiles").update({ credits_remaining: profile.credits_remaining - 1 }).eq("id", user.id);
      }
      await supabase.rpc('increment_total_analyses');
    } catch (dbErr) {
      console.error("DB Update failed...", dbErr);
    }

    return NextResponse.json({
      ...aiData,
      isLocked: !isPro,
      newCredits: isPro ? (profile?.credits_remaining || 0) : (profile?.credits_remaining || 1) - 1
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}