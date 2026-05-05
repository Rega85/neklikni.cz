"use client";

import { useEffect, useState } from "react";

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*?/<>".split("");

type Props = {
  text: string;
  /** Total animation duration in ms. Default 900. */
  duration?: number;
  /** How long each character has been scrambling before settling, in ms. Default 280. */
  perCharScramble?: number;
  className?: string;
};

/**
 * Matrix-style decode reveal: each character starts as a random glyph and
 * "settles" into the correct one with a small stagger. Runs once on mount.
 *
 * Respects prefers-reduced-motion (renders the final text immediately).
 */
export default function DecoderText({
  text,
  duration = 900,
  perCharScramble = 280,
  className,
}: Props) {
  const [display, setDisplay] = useState(() => {
    // SSR / first paint: render the actual text so layout is stable
    // and crawlers index the real string.
    return text;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const chars = Array.from(text);
    const settleAt = chars.map((c, i) => {
      if (c === " " || c === "\n") return 0;
      const ratio = chars.length > 1 ? i / (chars.length - 1) : 0;
      const base = (duration - perCharScramble) * ratio;
      return base + Math.random() * 80;
    });

    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      let allSettled = true;
      const next = chars.map((c, i) => {
        if (c === " " || c === "\n") return c;
        if (elapsed >= settleAt[i]) return c;
        allSettled = false;
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      });
      setDisplay(next.join(""));
      if (!allSettled) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, perCharScramble]);

  return <span className={className}>{display}</span>;
}
