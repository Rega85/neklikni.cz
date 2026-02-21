import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PROMPT = `Jsi elitní kyberbezpečnostní analytik. Analyzuj vstup na phishing s matematickou přesností. 
Vrať POUZE JSON:
{
  "risk": 0-100,
  "verdict": "AGRESIVNÍ VERDIKT",
  "analysis": "Expertní rozbor (2 věty).",
  "threats": ["hrozba 1", "hrozba 2"],
  "recommendation": "Bezpečnostní pokyn."
}
Skóre: 0-25 Safe, 26-60 Suspicious, 61-100 Malicious. Teplota 0 = buď konzistentní!`;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from("user_profiles").select("credits_remaining, tier").eq("id", userData.user.id).single();
    const isPro = (profile?.tier || "free").toLowerCase() === "pro";
    const credits = profile?.credits_remaining ?? 0;

    if (!isPro && credits <= 0) return NextResponse.json({ risk: "LIMIT", verdict: "Kredity vyčerpány." }, { status: 402 });

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

    if (!isPro && profile) {
      await supabaseAdmin.from("user_profiles").update({ credits_remaining: credits - 1 }).eq("id", userData.user.id);
    }
    await supabaseAdmin.rpc('increment_total_analyses');

    return NextResponse.json({ ...aiData, isLocked: !isPro, newCredits: isPro ? credits : credits - 1 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}