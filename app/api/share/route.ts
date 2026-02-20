import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  
  const { data, error } = await supabase
    .from("shared_results")
    .insert({
      risk: body.risk,
      verdict: body.verdict,
      analysis: body.analysis ?? null,
      threats: body.threats ?? [],
      recommendation: body.recommendation ?? null,
      tier: body.tier ?? "basic",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ 
    url: `https://www.neklikni.cz/report/${data.id}` 
  });
}