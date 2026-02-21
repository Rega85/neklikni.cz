import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) return NextResponse.json({ error: "Invalid user" }, { status: 401 });

    const body = await req.json();
    
    // Čistá analýza bez složitých podmínek, které by mohly házet chybu 500
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1500,
      temperature: 0,
      system: "Jsi expert na phishing. Vrať JSON: { risk: 0-100, verdict: 'text', analysis: 'text', threats: [], recommendation: 'text' }",
      messages: [{ role: "user", content: body.text || "Analyzuj toto." }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const aiData = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || "{}");

    // Pokus o update, ale pokud selže, analýzu to nepřeruší
    try {
      await supabaseAdmin.rpc('increment_total_analyses');
    } catch (e) { console.error("Stats update failed"); }

    return NextResponse.json(aiData);
  } catch (err: any) {
    return NextResponse.json({ error: "Chyba na serveru" }, { status: 500 });
  }
}