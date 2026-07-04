/**
 * Deterministický výběr + míchání 10 otázek ze QUESTION_POOL na základě
 * čísla seedu. Čistá funkce (žádný I/O, žádný Math.random/Date.now) —
 * buildQuizFromSeed(seed) vrací bajtově identický výsledek při každém
 * volání, ať běží na klientu (přes /api/test/start) nebo na serveru
 * (při /api/test/submit), pokud dostane stejný seed. To je celý základ
 * server-authoritative scoringu: žádná session tabulka není potřeba.
 */

import { QUESTION_POOL, YESNO_CHOICES, type Difficulty, type QuizQuestion } from './questions';

const PICK_COUNTS: Record<Difficulty, number> = { easy: 3, medium: 5, hard: 2 };

// Omit<> nedistribuuje přes discriminated union (QuizQuestion je union
// sjednocený přes 'ui'/'type') — plain Omit by smazal ui-specifické pole
// (sender/domain/from/...) ze všech větví najednou. DistributiveOmit
// aplikuje Omit na každou větev zvlášť, takže se union zachová.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type BuiltQuestion = DistributiveOmit<QuizQuestion, 'choices'> & {
  choices: readonly string[];
};

/** mulberry32 — malý, rychlý, deterministický PRNG ze 32bit seedu. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle poháněný předaným rng — nemutuje vstupní pole. */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Vybere a zamíchá 10 otázek pro daný seed:
 *  1. shuffle + oříznutí každého difficulty bucketu (easy/medium/hard)
 *     v tomto pevném pořadí volání rng
 *  2. shuffle pořadí zřetězeného výběru (3+5+2)
 *  3. u 'choice' otázek shuffle choices + přemapování correctIndex
 *
 * Vrací otázky VČETNĚ correctIndex/explanation. /api/test/start je
 * posílá klientovi tak, jak jsou — questions.ts je stejně veřejný
 * JS bundle, takže skrývání correctIndex jen ze síťové odpovědi by
 * nechránilo nic reálného a zbytečně by to zabilo okamžitou ✓/✗
 * zpětnou vazbu po každé otázce (jádro edukační hodnoty kvízu).
 * Reálnou ochranu proti brute-force drží claimOnce v /api/test/submit
 * (jeden seed = jeden vyhodnocený pokus), ne utajování odpovědí.
 */
export function buildQuizFromSeed(seed: number): BuiltQuestion[] {
  const rng = mulberry32(seed);

  const byDifficulty: Record<Difficulty, QuizQuestion[]> = {
    easy: QUESTION_POOL.filter((q) => q.difficulty === 'easy'),
    medium: QUESTION_POOL.filter((q) => q.difficulty === 'medium'),
    hard: QUESTION_POOL.filter((q) => q.difficulty === 'hard'),
  };

  const selected: QuizQuestion[] = [
    ...shuffle(byDifficulty.easy, rng).slice(0, PICK_COUNTS.easy),
    ...shuffle(byDifficulty.medium, rng).slice(0, PICK_COUNTS.medium),
    ...shuffle(byDifficulty.hard, rng).slice(0, PICK_COUNTS.hard),
  ];

  const ordered = shuffle(selected, rng);

  return ordered.map((q): BuiltQuestion => {
    if (q.type === 'yesno') {
      return { ...q, choices: YESNO_CHOICES };
    }
    const positions = shuffle(
      q.choices.map((_, i) => i),
      rng,
    );
    const choices = positions.map((i) => q.choices[i]);
    const correctIndex = positions.indexOf(q.correctIndex);
    return { ...q, choices, correctIndex };
  });
}
