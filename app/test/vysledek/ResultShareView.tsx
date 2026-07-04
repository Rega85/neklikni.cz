"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { levelForScore } from "@/lib/quiz/levels";

interface ResultShareViewProps {
  score: number;
}

// Tohle vidí ten, KDO KLIKNE na sdílený odkaz (na Facebooku apod.) —
// ne hráč samotný. Cíl je jednoduchý: ukázat cizí výsledek a hned
// nabídnout "zahraj si taky", ne duplikovat celou hru zbytečnou logikou.
export default function ResultShareView({ score }: ResultShareViewProps) {
  const level = levelForScore(score);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">{level.emoji}</span>
        <div>
          <p className="text-3xl font-bold text-foreground">{score} / 10</p>
          <p className="text-lg font-semibold text-primary mt-1">{level.label}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Tohle je výsledek kamaráda v kvízu <span className="text-foreground font-semibold">Poznáš podvod?</span>
        </p>
        <Link
          href="/test"
          className="mt-2 inline-flex items-center gap-2 brand-gradient text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
        >
          Zahrát si taky <ArrowRight size={16} />
        </Link>
      </div>
    </main>
  );
}
