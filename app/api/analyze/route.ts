import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PROMPT = `Jsi elitní kyberbezpečnostní analytik. Analyzuj vstup na phishing. 
Vrať POUZE ČISTÝ JSON v tomto formátu:
{
  "risk": 0-100,
  "verdict": "STRUČNÝ VERDIKT",
  "analysis": "Expertní rozbor (max 3 věty).",
  "threats": ["hrozba 1", "hrozba 2"],
  "recommendation": "Co má uživatel udělat."
}
Skóre: 0-25 Safe, 26-60 Suspicious, 61-100 Malicious. Teplota 0.`;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    
    if (!token) return NextResponse.json({ error: "Chybí autorizace" }, { status: 401 });

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Neplatný token" }, { status: 401 });

    const { data: profile, error: profErr } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profErr || !profile) {
      console.error("Profil nenalezen:", profErr);
      return NextResponse.json({ error: "Profil nenalezen" }, { status: 404 });
    }

    const tier = (profile.tier || "free").toLowerCase();
    const isPro = tier === "pro" || tier === "elite";
    const credits = profile.credits_remaining ?? 0;

    if (!isPro && credits <= 0) {
      return NextResponse.json({ error: "Kredity vyčerpány" }, { status: 402 });
    }

    const { text, imageUrl } = await req.json();
    const model = isPro ? "claude-3-5-sonnet-20241022" : "claude-3-haiku-20240307";

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      temperature: 0,
      system: PROMPT,
      messages: [{ 
        role: "user", 
        content: imageUrl 
          ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageUrl.split(',')[1] } }, { type: "text", text: "Analyzuj screenshot." }] 
          : [{ type: "text", text: `Analyzuj: "${text}"` }] 
      }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const aiData = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    // Aktualizace kreditů pouze pro free uživatele
    if (!isPro) {
      await supabaseAdmin
        .from("user_profiles")
        .update({ credits_remaining: credits - 1 })
        .eq("id", user.id);
    }
    
    await supabaseAdmin.rpc('increment_total_analyses');

    return NextResponse.json({ 
      ...aiData, 
      tier: profile.tier, 
      credits: isPro ? profile.credits_remaining : profile.credits_remaining - 1 
    });

  } catch (error: any) {
    console.error("API CRASH:", error);
    return NextResponse.json({ error: error.message || "Server Error" }, { status: 500 });
  }
}