import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { DatabazeDatabase } from "../databaze/_lib/database";

// Veřejné agregované počty pro homepage badge. Cachujeme přes revalidate,
// ať se Supabase nedotazuje na každý pageview.
export const revalidate = 300;

// Počet AI analýz provedených před nasazením `usage_log` (historická data).
const ANALYTICS_BASELINE = 215;

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const databazeAdmin = createClient<DatabazeDatabase>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Skutečný počet provedených AI analýz: baseline + registrovaní uživatelé
    // (1 řádek = 1 analýza) + anonymní uživatelé (count = počet za den/IP).
    const [usageLog, anonUsage, incidents] = await Promise.all([
      supabaseAdmin.from("usage_log").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("anonymous_usage").select("count"),
      databazeAdmin.from("incidents").select("*", { count: "exact", head: true }).eq("status", "published"),
    ]);

    const total = usageLog.error || anonUsage.error
      ? null
      : ANALYTICS_BASELINE + (usageLog.count ?? 0) + (anonUsage.data ?? []).reduce((sum, row) => sum + (row.count ?? 0), 0);

    return NextResponse.json({
      total,
      incidents: incidents.error ? null : incidents.count ?? 0,
    });
  } catch {
    return NextResponse.json({ total: null, incidents: null });
  }
}
