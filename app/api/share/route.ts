import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Validate all fields so no one can insert fabricated results
    if (typeof body.risk !== "number" || !Number.isInteger(body.risk) || body.risk < 0 || body.risk > 100) {
      return NextResponse.json({ error: "Invalid risk" }, { status: 400 });
    }
    if (typeof body.verdict !== "string" || body.verdict.trim().length === 0 || body.verdict.length > 500) {
      return NextResponse.json({ error: "Invalid verdict" }, { status: 400 });
    }
    if (body.analysis !== null && body.analysis !== undefined &&
        (typeof body.analysis !== "string" || body.analysis.length > 4000)) {
      return NextResponse.json({ error: "Invalid analysis" }, { status: 400 });
    }
    if (!Array.isArray(body.threats) || body.threats.length > 20 ||
        !body.threats.every((t: unknown) => typeof t === "string" && t.length <= 200)) {
      return NextResponse.json({ error: "Invalid threats" }, { status: 400 });
    }
    if (body.recommendation !== null && body.recommendation !== undefined &&
        (typeof body.recommendation !== "string" || body.recommendation.length > 1000)) {
      return NextResponse.json({ error: "Invalid recommendation" }, { status: 400 });
    }
    const validTiers = ["free", "easy", "basic", "pro"];
    if (body.tier !== undefined && !validTiers.includes(body.tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("shared_results")
      .insert({
        risk: body.risk,
        verdict: body.verdict.trim(),
        analysis: body.analysis ?? null,
        threats: body.threats ?? [],
        recommendation: body.recommendation ?? null,
        tier: body.tier ?? "basic",
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      url: `https://www.neklikni.cz/report/${data.id}`,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}