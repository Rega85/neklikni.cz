import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    
    if (authErr || !user) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier, credits_remaining")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile,
    });
  } catch (error) {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}