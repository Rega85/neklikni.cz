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

    // Načti admin IDs pro filtrování testovací aktivity z výsledků.
    // app_admins je malá tabulka (1-2 řádky) — extra round-trip je OK,
    // celý endpoint má 5min cache (revalidate=300).
    const { data: adminRows } = await supabaseAdmin
      .from("app_admins")
      .select("user_id")
    const adminIds = (adminRows ?? []).map(
      (r: { user_id: string }) => r.user_id
    )
    const notAdminFilter = adminIds.length > 0
      ? `(${adminIds.join(",")})`
      : null

    // Paralelní dotazy:
    //   usageLog   — AI analýzy přihlášených (bez adminů)
    //   anonUsage  — AI analýzy anonymních uživatelů (agregát per IP/den)
    //   incidents  — schválená nahlášení v databázi podvodů
    //   searchLog  — vyhledávání v databázi (anonymní i přihlášení, bez adminů)
    const [usageLog, anonUsage, incidents, searchLog] = await Promise.all([
      notAdminFilter
        ? supabaseAdmin
            .from("usage_log")
            .select("*", { count: "exact", head: true })
            .not("user_id", "in", notAdminFilter)
        : supabaseAdmin
            .from("usage_log")
            .select("*", { count: "exact", head: true }),

      supabaseAdmin.from("anonymous_usage").select("count"),

      databazeAdmin
        .from("incidents")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),

      notAdminFilter
        ? databazeAdmin
            .from("search_log")
            .select("*", { count: "exact", head: true })
            .or(`user_id.is.null,user_id.not.in.${notAdminFilter}`)
        : databazeAdmin
            .from("search_log")
            .select("*", { count: "exact", head: true }),
    ])

    const anonAiTotal = (anonUsage.data ?? []).reduce(
      (sum: number, row: { count: number | null }) => sum + (row.count ?? 0),
      0,
    )

    const total =
      usageLog.error || anonUsage.error || searchLog.error
        ? null
        : ANALYTICS_BASELINE
            + (usageLog.count ?? 0)   // AI analýzy přihlášených (bez adminů)
            + anonAiTotal             // AI analýzy anonymních
            + (searchLog.count ?? 0) // databázová vyhledávání (bez adminů)
            + (incidents.error ? 0 : incidents.count ?? 0) // schválená nahlášení

    return NextResponse.json({
      total,
      incidents: incidents.error ? null : incidents.count ?? 0,
    });
  } catch {
    return NextResponse.json({ total: null, incidents: null });
  }
}
