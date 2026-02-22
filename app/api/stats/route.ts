import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_stats")
      .select("value")
      .eq("key", "total_analyses")
      .single();

    if (error) throw error;

    return NextResponse.json(
      { total: data?.value ?? 0 },
      {
        headers: {
          // Cache 60 sekund — nemusíme číst DB při každém page loadu
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("Stats error:", err);
    // Při chybě vrátíme null — frontend zobrazí skeleton místo falešného čísla
    return NextResponse.json({ total: null });
  }
}