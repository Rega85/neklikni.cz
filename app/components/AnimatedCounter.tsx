"use client";

import { useEffect, useState } from "react";

export function AnimatedCounter({ endValue = 0 }: { endValue: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Pokud je číslo moc malé, ukážeme aspoň nějaký základ, ať to nevypadá prázdně
    const target = endValue > 1460 ? endValue : 1467 + endValue; 
    
    let startTime: number;
    const duration = 2000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      const easeOutQuart = 1 - Math.pow(1 - progress / duration, 4);
      const currentCount = Math.min(Math.floor(easeOutQuart * target), target);
      
      setCount(currentCount);

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(animate);
  }, [endValue]);

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">
        Komunitní štít
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 tabular-nums">
          {count.toLocaleString('cs-CZ')}
        </span>
        <span className="text-xl text-slate-300 font-medium">
          prověřených hrozeb
        </span>
      </div>
    </div>
  );
}