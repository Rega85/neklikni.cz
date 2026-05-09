"use client";

import { useEffect, useRef } from "react";

/**
 * Cyber particle network — subtle decorative canvas behind the hero.
 * - Desktop only (hidden on mobile to save battery + perf).
 * - Pauses when not on screen via IntersectionObserver.
 * - Honors prefers-reduced-motion (renders nothing).
 * - DPR-aware so it stays sharp on retina without over-rendering.
 */
export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let cssW = canvas.clientWidth;
    let cssH = canvas.clientHeight;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    type P = { x: number; y: number; vx: number; vy: number; hue: "purple" | "cyan" };
    const COUNT = 36;
    const MAX_DIST = 150;
    const particles: P[] = [];

    const seed = () => {
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * cssW,
          y: Math.random() * cssH,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          hue: Math.random() > 0.5 ? "purple" : "cyan",
        });
      }
    };
    seed();

    let running = true;
    let raf = 0;

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, cssW, cssH);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > cssW) p.vx *= -1;
        if (p.y < 0 || p.y > cssH) p.vy *= -1;

        const color = p.hue === "purple" ? "168, 85, 247" : "0, 212, 255";
        ctx.fillStyle = `rgba(${color}, 0.85)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < MAX_DIST * MAX_DIST) {
            const d = Math.sqrt(d2);
            const alpha = (1 - d / MAX_DIST) * 0.35;
            const color =
              a.hue === b.hue
                ? a.hue === "purple"
                  ? "168, 85, 247"
                  : "0, 212, 255"
                : "120, 130, 240";
            ctx.strokeStyle = `rgba(${color}, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      resize();
      seed();
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        if (visible && !running) {
          running = true;
          raf = requestAnimationFrame(tick);
        } else if (!visible) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="hidden md:block absolute top-0 left-0 right-0 pointer-events-none opacity-70 z-0"
      style={{ height: "100vh" }}
    />
  );
}
