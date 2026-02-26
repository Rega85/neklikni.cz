import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Try the fast atomic RPC counter first
    const { data, error } = await supabaseAdmin.rpc("get_total_analyses");
    if (!error && data != null && data > 0) {
      return NextResponse.json({ total: data });
    }
    if (error && data == null) return NextResponse.json({ total: 0 });

    // Fallback: count actual rows in shared_results
    const { count } = await supabaseAdmin
      .from("shared_results")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({ total: count ?? 0 });
  } catch {
    return NextResponse.json({ total: 0 });
  }
}
