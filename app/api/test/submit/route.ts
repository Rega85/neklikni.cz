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
 *
 * TEMP: podrobné krokové logy + top-level try/catch kvůli diagnostice
 * "Něco se nepovedlo" na preview — odstranit, až bude jasná příčina.
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
  try {
    const body = (await req.json().catch(() => null)) as SubmitBody | null;
    if (!body || typeof body !== "object") {
      console.warn("[submit] TEMP: chybí/neplatné tělo requestu");
      return NextResponse.json({ error: "Neplatný požadavek" }, { status: 400 });
    }

    const { seed, answers } = body;

    // ── 1) Tvarová validace — žádné vyhodnocování, jen kontrola vstupu ──
    if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      console.warn("[submit] TEMP: neplatný seed:", seed);
      return NextResponse.json({ error: "Neplatný seed" }, { status: 400 });
    }
    if (
      !Array.isArray(answers) ||
      answers.length !== 10 ||
      !answers.every((a) => typeof a === "number" && Number.isInteger(a) && a >= 0)
    ) {
      console.warn("[submit] TEMP: neplatné answers:", answers);
      return NextResponse.json({ error: "Odpovědi musí být pole přesně 10 čísel" }, { status: 400 });
    }

    const questions = buildQuizFromSeed(seed);
    for (let i = 0; i < questions.length; i++) {
      const maxIndex = questions[i].choices.length - 1;
      if (answers[i] > maxIndex) {
        console.warn(`[submit] TEMP: odpověď mimo rozsah na otázce ${i + 1}: answers[i]=${answers[i]}, max=${maxIndex}`);
        return NextResponse.json({ error: `Neplatná odpověď na otázku ${i + 1}` }, { status: 400 });
      }
    }
    console.log(`[submit] TEMP: validace OK, seed=${seed}`);

    // ── 2) Jednorázovost seedu — TEPRVE TEĎ se utrácí ──
    const claimed = await claimOnce(`quiz:seed:${seed}`, SEED_TTL_SECONDS);
    console.log(`[submit] TEMP: claimOnce(seed=${seed}) ->`, claimed);
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
    console.log(`[submit] TEMP: score=${score}`);

    // Cache skóre pod seedem pro pozdější /api/test/join (viz docstring výše).
    await setWithTtl(`quiz:result:${seed}`, score, SEED_TTL_SECONDS);
    console.log("[submit] TEMP: setWithTtl OK");

    let admin;
    try {
      admin = getAdmin();
      console.log("[submit] TEMP: getAdmin() OK (service role env přítomný)");
    } catch (err) {
      console.error("[submit] TEMP: getAdmin() selhal:", err);
      throw err;
    }

    const [percentile, totalCompleted] = await Promise.all([
      computePercentile(admin, score).catch((err) => {
        console.error("[submit] TEMP: computePercentile selhal:", err);
        throw err;
      }),
      (async () => {
        const current = await getTotalCompleted(admin);
        const next = current + 1;
        const { error } = await admin
          .from("site_stats")
          .update({ value: next, updated_at: new Date().toISOString() })
          .eq("key", "quiz_completions");
        if (error) {
          console.error("[submit] TEMP: site_stats update selhal:", error.message);
          throw error;
        }
        return next;
      })(),
    ]);
    console.log(`[submit] TEMP: percentile=${percentile}, totalCompleted=${totalCompleted} — hotovo`);

    return NextResponse.json({
      score,
      level: { label: level.label, emoji: level.emoji },
      percentile,
      totalCompleted,
      perQuestion,
    });
  } catch (err) {
    console.error("[submit] TEMP: neočekávaná výjimka:", err instanceof Error ? err.stack ?? err.message : err);
    return NextResponse.json({ error: "Interní chyba serveru" }, { status: 500 });
  }
}
