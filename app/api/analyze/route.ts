import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SYSTEM_PROMPT = `Jsi elitní kyberbezpečnostní analytik. Tvým úkolem je provést nekompromisní analýzu phishingu.
Uživatel má PREMIUM tarif, vypracuj obsáhlý, technicky detailní rozbor (2-3 odstavce). 
Vrať POUZE ČISTÝ JSON (nic jiného):
{
  "risk": 0-100,
  "verdict": "AGRESIVNÍ VERDIKT",
  "analysis": "Hloubková analýza...",
  "threats": ["hrozba 1", "hrozba 2", "hrozba 3"],
  "recommendation": "Přesný bezpečnostní postup"
}
Teplota 0. Konzistentní výsledky.`;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Invalid user" }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from("user_profiles").select("*").eq("id", user.id).single();
    const tier = (profile?.tier || "free").toLowerCase();
    const isHighTier = tier === "pro" || tier === "elite";

    const body = await req.json();
    const model = isHighTier ? "claude-3-5-sonnet-20241022" : "claude-3-haiku-20240307";

    const msg = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: body.imageUrl ? "Analyzuj screenshot." : `Analyzuj: "${body.text}"` }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const match = raw.match(/\{[\s\S]*\}/);
    const aiData = JSON.parse(match ? match[0] : "{}");

    if (tier === "free" && profile) {
      await supabaseAdmin.from("user_profiles").update({ credits_remaining: profile.credits_remaining - 1 }).eq("id", user.id);
    }
    await supabaseAdmin.rpc('increment_total_analyses');

    return NextResponse.json({ ...aiData, tier });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}