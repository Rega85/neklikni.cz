import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function checkIsAdmin(userId: string): Promise<boolean> {
  // app_admins RLS dovolí SELECT jen adminům, takže anon/authenticated klient
  // by vrátil 0 řádků i pro reálného admina. Použij service_role pro spolehlivý
  // lookup. Tahle informace je čistě pro UX (skrytí položky v menu) — reálnou
  // bariéru drží /admin/moderace a /api/admin/moderace na své straně.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  try {
    const admin = createAdminClient(url, key);
    const { data, error } = await admin
      .from("app_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.warn("checkIsAdmin lookup failed:", error.message);
      return false;
    }
    return !!data;
  } catch (err) {
    console.warn("checkIsAdmin exception:", err);
    return false;
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const [profileRes, isAdmin] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("tier, credits_remaining, referral_code")
        .eq("id", user.id)
        .single(),
      checkIsAdmin(user.id),
    ]);

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: profileRes.data,
      is_admin: isAdmin,
    });
  } catch (error) {
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}