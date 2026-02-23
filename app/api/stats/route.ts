import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_total_analyses");
    if (error) throw error;
    return NextResponse.json({ total: data || 2679 });
  } catch {
    return NextResponse.json({ total: 2679 });
  }
}