/**
 * GET /api/test/stats
 *
 * Veřejné, jen pro čtení: kolik lidí už dokončilo kvíz "Poznáš podvod?".
 * Čte site_stats.quiz_completions — stejný vzor jako /api/stats pro
 * homepage badge (service-role klient + revalidate cache, ať se
 * Supabase nedotazuje na každý pageview /test).
 *
 * Číslo je jen social proof (Část "počítadlo otestovaných"), ne
 * bezpečnostní hodnota — proto tu žádná autorizace ani rate limit není.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

export async function GET() {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await admin
      .from("site_stats")
      .select("value")
      .eq("key", "quiz_completions")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ totalCompleted: data?.value ?? 0 });
  } catch {
    return NextResponse.json({ totalCompleted: null });
  }
}
