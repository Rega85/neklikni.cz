/**
 * Pojmenované úrovně kvízu "Poznáš podvod?" podle skóre 0-10.
 * Sdíleno mezi /api/test/submit, výsledkovou stránkou a /api/og,
 * aby úroveň vždy odpovídala skóre stejným pravidlem na všech místech.
 */

export interface QuizLevel {
  min: number;
  max: number;
  label: string;
  emoji: string;
}

export const QUIZ_LEVELS: readonly QuizLevel[] = [
  { min: 9, max: 10, label: 'Digitální ostříž', emoji: '🦅' },
  { min: 7, max: 8, label: 'Opatrný vlk', emoji: '🐺' },
  { min: 4, max: 6, label: 'Lehce zranitelný', emoji: '😅' },
  { min: 0, max: 3, label: 'Lehká kořist', emoji: '🎣' },
];

export function levelForScore(score: number): QuizLevel {
  const level = QUIZ_LEVELS.find((l) => score >= l.min && score <= l.max);
  if (!level) throw new Error(`levelForScore: skóre mimo rozsah: ${score}`);
  return level;
}
