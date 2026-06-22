/**
 * POST /api/profile/newsletter-consent
 *
 * Zápis/změna newsletter souhlasu pro přihlášeného uživatele. Voláno z:
 *  - /onboarding/newsletter (po prvním OAuth/magic-link přihlášení)
 *  - /profile (přepínač zapnout/vypnout)
 *
 * Registrace e-mailem zapisuje souhlas jinou cestou (přes emailRedirectTo
 * → /auth/callback), protože v okamžiku signUp() ještě nemá session.
 *
 * RLS policy "Users can update own profile" dovolí UPDATE vlastního
 * řádku bez service-role — stejný vzor jako /api/databaze/my-incidents.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Stejná whitelist jako ACCEPTED_NEWSLETTER_CONSENT_VERSIONS v
// app/auth/callback/route.ts — chrání DB sloupec před zfalšovanou hodnotou.
const ACCEPTED_NEWSLETTER_CONSENT_VERSIONS: ReadonlySet<string> = new Set(["2026-06"]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const consent = body?.consent;
  const consentVersion = body?.consent_version;

  if (typeof consent !== "boolean") {
    return NextResponse.json({ error: "consent musí být boolean" }, { status: 400 });
  }
  if (typeof consentVersion !== "string" || !ACCEPTED_NEWSLETTER_CONSENT_VERSIONS.has(consentVersion)) {
    return NextResponse.json({ error: "Neplatná verze znění souhlasu" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      newsletter_consent: consent,
      // _at/_version = "poslední změna stavu" (i odhlášení), viz auth/callback.
      newsletter_consent_at: new Date().toISOString(),
      newsletter_consent_version: consentVersion,
    })
    .eq("id", user.id);

  if (error) {
    console.error("newsletter-consent update failed:", error.message);
    return NextResponse.json({ error: "Nepodařilo se uložit" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, consent });
}
