import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [{ data: profile }, { count }] = await Promise.all([
      supabaseAdmin
        .from("user_profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", user.id),
    ]);

    return NextResponse.json({
      code: profile?.referral_code ?? null,
      referredCount: count ?? 0,
      bonusCreditsEarned: (count ?? 0) * 5,
    });
  } catch (err) {
    console.warn("Referral route error:", err);
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
