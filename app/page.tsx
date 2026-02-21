import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Admin klient, který vidí všechno (RLS bypass)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

    // Ověříme usera přes token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (!user || authError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Vytáhneme profil admin silou
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("credits_remaining, tier")
      .eq("id", user.id)
      .single();

    const tier = (profile?.tier || "free").toLowerCase();
    const isPro = tier === "pro" || tier === "elite";
    const hasCredits = (profile?.credits_remaining || 0) > 0;

    if (!isPro && !hasCredits) {
      return NextResponse.json({ risk: "LIMIT", verdict: "Kredity vyčerpány." }, { status: 402 });
    }

    const { text, imageUrl } = await req.json();
    const model = isPro ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001";

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: `Vrať POUZE JSON: {"risk": 0-100, "verdict": "...", "analysis": "...", "threats": [], "recommendation": "..."}`,
      messages: [{ role: "user", content: [{ type: "text", text: imageUrl ? "Analyzuj screenshot: " + imageUrl : "Analyzuj: " + text }] }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    const aiData = JSON.parse(match ? match[0] : raw);

    if (!isPro && profile) {
      await supabaseAdmin.from("user_profiles").update({ credits_remaining: profile.credits_remaining - 1 }).eq("id", user.id);
    }
    await supabaseAdmin.rpc('increment_total_analyses');

    return NextResponse.json({ ...aiData, isLocked: !isPro });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}