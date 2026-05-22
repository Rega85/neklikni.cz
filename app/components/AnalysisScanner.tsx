"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";

/**
 * Vizuální bezpečnostní skener zobrazený během čekání na AI analýzu.
 *
 * Animace:
 *  - Horizontální "scan line" projíždí shora dolů přes celou kartu (1.5s loop).
 *  - Seznam kontrolních kroků se sekvenčně odškrtává (~600ms mezi nimi).
 *
 * Kroky NEjsou napojené na reálný průběh API (jeden HTTP call) — jsou
 * čistě dekorativní a slouží k odbavení čekání. Když přijde výsledek
 * dřív, parent přestane renderovat scanner.
 *
 * prefers-reduced-motion: zobrazí se statická verze bez animací.
 */

const STEPS = [
  "Kontroluji odesílatele",
  "Ověřuji odkazy a domény",
  "Hledám známé vzorce podvodu",
  "Porovnávám s databází incidentů",
  "Vyhodnocuji jazyk a naléhavost",
];

const STEP_INTERVAL_MS = 600;

export default function AnalysisScanner() {
  const [completedSteps, setCompletedSteps] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mql?.matches) {
      setReduceMotion(true);
      return;
    }

    let cancelled = false;
    let step = 0;
    const tick = () => {
      if (cancelled) return;
      step += 1;
      if (step >= STEPS.length) {
        setCompletedSteps(STEPS.length);
        return;
      }
      setCompletedSteps(step);
      setTimeout(tick, STEP_INTERVAL_MS);
    };
    const t = setTimeout(tick, STEP_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (reduceMotion) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="max-w-3xl mx-auto w-full rounded-[32px] border border-purple-500/20 bg-slate-950/70 p-8 sm:p-10"
      >
        <div className="flex items-center gap-3 mb-5">
          <ShieldCheck size={20} className="text-purple-300" aria-hidden="true" />
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-200">
            Probíhá bezpečnostní analýza…
          </p>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          {STEPS.map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden="true" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="analysis-scanner relative max-w-3xl mx-auto w-full overflow-hidden rounded-[32px] border border-purple-500/20 bg-slate-950/70 backdrop-blur-xl shadow-2xl p-8 sm:p-10"
    >
      {/* Scan line — moves top → bottom */}
      <div
        aria-hidden="true"
        className="analysis-scanner__line pointer-events-none absolute inset-x-0 h-px"
      />
      {/* Soft scanning gradient that follows the line */}
      <div
        aria-hidden="true"
        className="analysis-scanner__sweep pointer-events-none absolute inset-x-0 h-24"
      />

      <div className="relative z-[1] flex items-center gap-3 mb-6">
        <ShieldCheck size={20} className="text-purple-300" aria-hidden="true" />
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-slate-200">
          Probíhá bezpečnostní analýza
        </p>
      </div>

      <ul className="relative z-[1] space-y-3">
        {STEPS.map((label, i) => {
          const done = i < completedSteps;
          const active = i === completedSteps;
          return (
            <li
              key={label}
              className={`flex items-center gap-3 text-sm transition-colors duration-300 ${
                done
                  ? "text-slate-100"
                  : active
                  ? "text-slate-200"
                  : "text-slate-500"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  done
                    ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                    : active
                    ? "border-purple-400/60 bg-purple-500/15 text-purple-200"
                    : "border-slate-700 bg-slate-900/50 text-slate-600"
                }`}
                aria-hidden="true"
              >
                {done ? (
                  <Check size={13} />
                ) : active ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
