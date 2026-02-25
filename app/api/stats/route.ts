import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_total_analyses");
    if (error) {
      console.error("get_total_analyses RPC failed:", error);
      return NextResponse.json({ total: 0 });
    }
    return NextResponse.json({ total: data ?? 0 });
  } catch (e) {
    console.error("Stats route error:", e);
    return NextResponse.json({ total: 0 });
  }
}