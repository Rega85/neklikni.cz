/**
 * POST /api/test/join
 *
 * Volitelný krok PO výsledku kvízu: zápis (nebo zlepšení) skóre do
 * veřejného žebříčku. Neposílá se skóre ani odpovědi znovu — server
 * čte skóre z krátkodobé cache navázané na seed (zapsané v
 * /api/test/submit hned po úspěšném claimu), takže zůstává server-
 * authoritative: klient nemůže poslat vymyšlené skóre ani z tohohle
 * endpointu.
 *
 * Pokud cache vypršela (stejná TTL jako claim, výchozí 1h) — typicky
 * když registrace/přihlášení trvalo moc dlouho — vrátíme 410 a klient
 * musí kvíz zahrát znovu. To je záměrně jednodušší a bezpečnější než
 * tahat seed+odpovědi přes celý auth flow (viz komentář v QuizGame.tsx
 * u resume-after-redirect).
 *
 * Dva souhlasy jsou striktně oddělené a nezávislé:
 *  - display_name_consent (zobrazení na žebříčku) — POVINNÝ pro zápis,
 *    bez něj 400, žádná výjimka.
 *  - newsletter_consent — nepovinný, nemá žádný vliv na to, jestli se
 *    zapíše žebříček. Používá stávající newsletter_consent infrastrukturu
 *    (stejná whitelist verzí jako register/profile).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getValue } from "@/app/api/_lib/ratelimit";
import { levelForScore } from "@/lib/quiz/levels";
import {
  getAdmin,
  deriveDisplayName,
  computePercentile,
  getTotalCompleted,
  NAME_RE,
  ACCEPTED_NEWSLETTER_CONSENT_VERSIONS,
} from "../_lib/shared";

export const dynamic = "force-dynamic";

interface JoinBody {
  seed?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  display_name_consent?: unknown;
  newsletter_consent?: unknown;
  newsletter_consent_version?: unknown;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as JoinBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Neplatný požadavek" }, { status: 400 });
  }

  const { seed } = body;
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    return NextResponse.json({ error: "Neplatný seed" }, { status: 400 });
  }

  // Souhlas se zobrazením na žebříčku je NEZÁVISLÝ na newsletteru a
  // POVINNÝ pro zápis — bez něj se dál ani nevaliduje jméno.
  if (body.display_name_consent !== true) {
    return NextResponse.json({ error: "Je potřeba souhlas se zobrazením na žebříčku" }, { status: 400 });
  }

  const firstName = typeof body.first_name === "string" ? body.first_name.trim() : "";
  const lastName = typeof body.last_name === "string" ? body.last_name.trim() : "";
  if (!NAME_RE.test(firstName) || !NAME_RE.test(lastName)) {
    return NextResponse.json({ error: "Neplatné jméno nebo příjmení" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Pro žebříček je potřeba být přihlášen" }, { status: 401 });
  }

  // Skóre bereme VÝHRADNĚ z cache navázané na seed — nikdy z requestu.
  const score = await getValue<number>(`quiz:result:${seed}`);
  if (score === null || typeof score !== "number" || score < 0 || score > 10) {
    return NextResponse.json(
      { error: "Tenhle výsledek už není platný. Zahraj si kvíz znovu." },
      { status: 410 },
    );
  }

  const admin = getAdmin();
  const displayName = deriveDisplayName(firstName, lastName);

  // Atomický upsert jen při zlepšení best_score — viz migrace
  // 20260704_quiz_leaderboard_upsert.sql.
  const { error: upsertErr } = await admin.rpc("quiz_leaderboard_upsert", {
    p_user_id: user.id,
    p_display_name: displayName,
    p_score: score,
  });

  if (upsertErr) {
    console.error("quiz_leaderboard_upsert failed:", upsertErr.message);
    return NextResponse.json({ error: "Nepodařilo se uložit do žebříčku" }, { status: 500 });
  }

  // Newsletter souhlas — nezávislý na leaderboard souhlasu, stejná
  // whitelist verzí jako profile/newsletter-consent. Chybí-li nebo je
  // false, prostě se nic nezapisuje (nepřepisujeme dřívější true na false).
  if (body.newsletter_consent === true && typeof body.newsletter_consent_version === "string") {
    if (ACCEPTED_NEWSLETTER_CONSENT_VERSIONS.has(body.newsletter_consent_version)) {
      const { error: newsletterErr } = await supabase
        .from("user_profiles")
        .update({
          newsletter_consent: true,
          newsletter_consent_at: new Date().toISOString(),
          newsletter_consent_version: body.newsletter_consent_version,
        })
        .eq("id", user.id);
      if (newsletterErr) {
        console.error("newsletter-consent update (quiz join) failed:", newsletterErr.message);
      }
    }
  }

  const [percentile, totalCompleted] = await Promise.all([
    computePercentile(admin, score),
    getTotalCompleted(admin),
  ]);
  const level = levelForScore(score);

  return NextResponse.json({
    joined: true,
    displayName,
    score,
    level: { label: level.label, emoji: level.emoji },
    percentile,
    totalCompleted,
  });
}
