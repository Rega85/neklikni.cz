"use client";

import { useEffect, useState } from "react";

const DEFAULT_MESSAGES = [
  "Analyzuji obsah pomocí AI…",
  "Extrakce signálů…",
  "Generuji verdikt…",
];

const MESSAGE_INTERVAL_MS = 1600;

interface Props {
  messages?: string[];
}

export default function AnalysisScanner({ messages = DEFAULT_MESSAGES }: Props) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mql?.matches) {
      setReduceMotion(true);
      return;
    }
    const id = setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="analysis-scanner relative w-full overflow-hidden rounded-xl border border-primary/25 bg-card backdrop-blur-xl shadow-[0_0_40px_-15px_oklch(0.62_0.19_256_/_0.4)] px-5 py-4"
    >
      {!reduceMotion && (
        <>
          <div
            aria-hidden="true"
            className="analysis-scanner__line pointer-events-none absolute inset-x-0 h-px"
          />
          <div
            aria-hidden="true"
            className="analysis-scanner__sweep pointer-events-none absolute inset-x-0 h-24"
          />
        </>
      )}

      <div className="relative z-[1] flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
          {!reduceMotion && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          )}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_oklch(0.62_0.19_256_/_0.6)]" />
        </span>
        <p
          key={messageIndex}
          className="text-sm font-medium text-foreground tracking-wide animate-[fade-up_400ms_ease-out]"
        >
          {messages[messageIndex % messages.length]}
        </p>
      </div>
    </div>
  );
}
