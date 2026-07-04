/**
 * POST /api/test/start
 *
 * Vygeneruje nový náhodný seed a vrátí klientovi jemu odpovídající
 * zamíchanou sadu 10 otázek VČETNĚ correctIndex/explanation. Otázky
 * jsou stejně veřejný JS bundle (lib/quiz/questions.ts) — utajovat
 * odpovědi jen v téhle síťové odpovědi by nechránilo nic reálného
 * a jen by zabilo okamžitou ✓/✗ zpětnou vazbu po každé otázce, což
 * je jádro edukační hodnoty kvízu.
 *
 * Skutečná ochrana proti brute-force je v /api/test/submit: jeden
 * seed = jeden vyhodnocený a započítaný pokus (claimOnce). Odpovědi
 * chráníme jen do žebříčku/skóre, ne před přečtením.
 *
 * Seed se nikde neukládá — je to čistě vstup do deterministické
 * buildQuizFromSeed(), kterou /api/test/submit zavolá znovu se
 * stejným seedem a dostane bajtově stejnou sadu.
 */

import { NextResponse } from "next/server";
import { buildQuizFromSeed } from "@/lib/quiz/build";

export const dynamic = "force-dynamic";

function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0];
}

export async function POST() {
  const seed = randomSeed();
  const questions = buildQuizFromSeed(seed);
  return NextResponse.json({ seed, questions });
}
