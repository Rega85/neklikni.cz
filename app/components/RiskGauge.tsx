"use client";

import { useEffect, useState } from "react";

type Props = {
  /** 0-100 */
  value: number;
  size?: number;
};

/**
 * Animated circular risk gauge.
 * Color shifts from green → amber → coral based on value.
 */
export default function RiskGauge({ value, size = 200 }: Props) {
  const safeValue = Math.max(0, Math.min(100, value));
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    // Animate from 0 → safeValue on mount / value change
    const start = performance.now();
    const duration = 900;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setAnimated(safeValue * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [safeValue]);

  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated / 100);

  // Color zones
  const isHigh = safeValue >= 70;
  const isMid = !isHigh && safeValue >= 40;
  const stops = isHigh
    ? { from: "#fb7185", to: "#dc2626" }            // coral → red
    : isMid
    ? { from: "#fbbf24", to: "#f59e0b" }            // amber gradient
    : { from: "#34d399", to: "#10b981" };           // green gradient

  const numColor = isHigh ? "text-destructive" : isMid ? "text-warning" : "text-success";
  const label = isHigh ? "Vysoké riziko" : isMid ? "Střední riziko" : "Nízké riziko";
  const labelColor = isHigh ? "text-destructive/90" : isMid ? "text-warning/90" : "text-success/90";

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="riskGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={stops.from} />
            <stop offset="100%" stopColor={stops.to} />
          </linearGradient>
          <filter id="riskGaugeGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Animated arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#riskGaugeGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#riskGaugeGlow)"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <div className={`text-5xl sm:text-6xl font-black tracking-tighter ${numColor}`}>
          {Math.round(animated)}<span className="text-2xl sm:text-3xl opacity-80">%</span>
        </div>
        <div className={`text-[10px] font-black uppercase tracking-widest ${labelColor}`}>
          {label}
        </div>
      </div>
    </div>
  );
}
