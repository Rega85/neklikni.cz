/**
 * POST /api/test/submit
 *
 * Server-authoritative scoring kvízu "Poznáš podvod?". Klient posílá
 * jen { seed, answers: number[] } — NIKDY hotové skóre. Server
 * rekonstruuje kanonickou sadu ze seedu (lib/quiz/build.ts) a sám
 * spočítá, co je správně.
 *
 * Pořadí kroků je záměrné a bezpečnostně důležité:
 *   1. Tvarová validace vstupu — čistě výpočetní, nic nezapisuje, smí
 *      se opakovat libovolně (např. po chybě v klientovi) beze ztráty
 *      pokusu.
 *   2. claimOnce(seed) — AŽ TEĎ se "utrácí" jednorázovost seedu.
 *      Selže-li (seed už použit) → 409, žádné skóre se neprozradí.
 *   3. Skutečné vyhodnocení a zápisy (site_stats čítač).
 *
 * Rozhodnutí "chci do žebříčku" padá AŽ PO vidění výsledku (samostatný
 * krok v UI), tedy až po tomhle volání — kdy je seed už spálený. Proto
 * si sem uložíme spočítané skóre do krátkodobé cache pod seedem
 * (setWithTtl), kterou si /api/test/join později přečte a zapíše do
 * žebříčku, aniž by klient posílal skóre nebo odpovědi znovu.
 */

import { NextResponse } from "next/server";
import { buildQuizFromSeed } from "@/lib/quiz/build";
import { levelForScore } from "@/lib/quiz/levels";
import { claimOnce, setWithTtl } from "@/app/api/_lib/ratelimit";
import { getAdmin, computePercentile, getTotalCompleted } from "../_lib/shared";

export const dynamic = "force-dynamic";

// 1h — dost na dohrání kvízu a i na volitelné doplnění do žebříčku
// hned po registraci (viz /api/test/join). Po vypršení musí uživatel
// zahrát znovu, žádná výjimka.
const SEED_TTL_SECONDS = 60 * 60;

interface SubmitBody {
  seed?: unknown;
  answers?: unknown;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as SubmitBody | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Neplatný požadavek" }, { status: 400 });
  }

  const { seed, answers } = body;

  // ── 1) Tvarová validace — žádné vyhodnocování, jen kontrola vstupu ──
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    return NextResponse.json({ error: "Neplatný seed" }, { status: 400 });
  }
  if (
    !Array.isArray(answers) ||
    answers.length !== 10 ||
    !answers.every((a) => typeof a === "number" && Number.isInteger(a) && a >= 0)
  ) {
    return NextResponse.json({ error: "Odpovědi musí být pole přesně 10 čísel" }, { status: 400 });
  }

  const questions = buildQuizFromSeed(seed);
  for (let i = 0; i < questions.length; i++) {
    const maxIndex = questions[i].choices.length - 1;
    if (answers[i] > maxIndex) {
      return NextResponse.json({ error: `Neplatná odpověď na otázku ${i + 1}` }, { status: 400 });
    }
  }

  // ── 2) Jednorázovost seedu — TEPRVE TEĎ se utrácí ──
  const claimed = await claimOnce(`quiz:seed:${seed}`, SEED_TTL_SECONDS);
  if (!claimed) {
    return NextResponse.json(
      { error: "Tento pokus už byl vyhodnocen. Spusť nový kvíz." },
      { status: 409 },
    );
  }

  // ── 3) Server je jediný zdroj pravdy o skóre ──
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0);
  const level = levelForScore(score);
  const perQuestion = questions.map((q, i) => ({
    id: q.id,
    correct: answers[i] === q.correctIndex,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));

  // Cache skóre pod seedem pro pozdější /api/test/join (viz docstring výše).
  await setWithTtl(`quiz:result:${seed}`, score, SEED_TTL_SECONDS);

  const admin = getAdmin();

  const [percentile, totalCompleted] = await Promise.all([
    computePercentile(admin, score),
    (async () => {
      // Read-modify-write, ne atomické. Je to jen social-proof číslo, ne
      // bezpečnostní ani finanční hodnota — drobná nepřesnost při souběhu
      // je přijatelná cena za to, že nepřidáváme další Postgres funkci
      // jen pro tohle.
      const current = await getTotalCompleted(admin);
      const next = current + 1;
      await admin
        .from("site_stats")
        .update({ value: next, updated_at: new Date().toISOString() })
        .eq("key", "quiz_completions");
      return next;
    })(),
  ]);

  return NextResponse.json({
    score,
    level: { label: level.label, emoji: level.emoji },
    percentile,
    totalCompleted,
    perQuestion,
  });
}
