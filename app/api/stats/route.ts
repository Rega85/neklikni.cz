import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Skutečný počet provedených AI analýz: registrovaní uživatelé
    // (1 řádek = 1 analýza) + anonymní uživatelé (count = počet za den/IP).
    const [usageLog, anonUsage] = await Promise.all([
      supabaseAdmin.from("usage_log").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("anonymous_usage").select("count"),
    ]);

    if (usageLog.error || anonUsage.error) {
      return NextResponse.json({ total: null });
    }

    const anonTotal = (anonUsage.data ?? []).reduce((sum, row) => sum + (row.count ?? 0), 0);
    return NextResponse.json({ total: (usageLog.count ?? 0) + anonTotal });
  } catch {
    return NextResponse.json({ total: null });
  }
}
