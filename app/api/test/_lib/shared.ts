/**
 * Sdílené věci mezi /api/test/submit a /api/test/join — validace jména,
 * odvození display_name (celé příjmení se do DB nikdy nedostane),
 * percentil a čtení globálního počítadla dokončení.
 */

import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";

export const MIN_LEADERBOARD_ROWS_FOR_PERCENTILE = 20;

// Stejná whitelist jako app/api/profile/newsletter-consent/route.ts a
// app/auth/callback/route.ts — chrání sloupec před zfalšovanou hodnotou.
export const ACCEPTED_NEWSLETTER_CONSENT_VERSIONS: ReadonlySet<string> = new Set(["2026-06"]);

// Křestní jméno / příjmení pro odvození "Jméno P." — písmena (i s diakritikou),
// mezery, apostrof a spojovník. Bez číslic/HTML/emoji.
export const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s'-]{0,39}$/u;

export function getAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role env missing");
  return createAdminClient(url, key);
}

// Celé příjmení se nikdy neukládá — jen jeho první písmeno.
export function deriveDisplayName(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const lastInitial = lastName.trim().charAt(0).toUpperCase();
  return `${first} ${lastInitial}.`.slice(0, 50);
}

export async function computePercentile(admin: SupabaseClient, score: number): Promise<number | null> {
  const [{ count: total }, { count: lower }] = await Promise.all([
    admin.from("quiz_leaderboard").select("*", { count: "exact", head: true }),
    admin.from("quiz_leaderboard").select("*", { count: "exact", head: true }).lt("best_score", score),
  ]);
  if (total === null || total < MIN_LEADERBOARD_ROWS_FOR_PERCENTILE) return null;
  return Math.round(((lower ?? 0) / total) * 100);
}

export async function getTotalCompleted(admin: SupabaseClient): Promise<number> {
  const { data } = await admin
    .from("site_stats")
    .select("value")
    .eq("key", "quiz_completions")
    .maybeSingle();
  return data?.value ?? 0;
}
