"use client";

import { useEffect, useState } from "react";
import HomeSections from "./HomeSections";
import { HomeSchema } from "./StructuredData";
import ErrorBoundary from "./ErrorBoundary";
import OveritClient from "../overit/OveritClient";
import type { RecentIncidentCard } from "../databaze/_lib/recentIncidents";

interface Props {
  recentIncidents: RecentIncidentCard[];
}

export default function HomeClient({ recentIncidents }: Props) {
  const [stats, setStats] = useState<{
    analyses: number | null;
    incidents: number | null;
  }>({ analyses: null, incidents: null });

  // resetSignal jako remount-key pro <OveritClient> — Header.handleHomeClick
  // vystřelí "homeReset" při kliknutí na logo/Domů, když už jsme na "/"
  // (Next.js při stejné URL nepřenaviguje, takže se stav jinak neresetuje).
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        setStats({
          analyses: typeof d?.total === "number" ? d.total : null,
          incidents: typeof d?.incidents === "number" ? d.incidents : null,
        }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const reset = () => setResetSignal((n) => n + 1);
    window.addEventListener("homeReset", reset);
    return () => window.removeEventListener("homeReset", reset);
  }, []);

  return (
    <div className="flex flex-col min-h-screen ">
      <HomeSchema />
      <main className="flex-grow text-foreground pt-20 sm:pt-16 px-4 sm:px-6 pb-8 flex flex-col items-center relative">
        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="max-w-2xl w-full mx-auto relative z-10 text-center space-y-4 sm:space-y-5">
          {stats.analyses !== null && (
            <>
              {/* Mobile — kompaktní jednořádkový badge */}
              <div className="flex sm:hidden items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="motion-safe:animate-[ping_2s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="font-semibold text-foreground">
                  {stats.analyses.toLocaleString("cs-CZ")}
                </span>
                <span>prověřeno</span>
              </div>

              {/* Desktop — plný badge */}
              <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border text-xs sm:text-[13px] text-muted-foreground backdrop-blur-sm">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="motion-safe:animate-[ping_2s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-success">
                  online
                </span>
                <span className="text-muted-foreground">·</span>
                <span>
                  <span className="font-semibold text-foreground">
                    {stats.analyses.toLocaleString("cs-CZ")}
                  </span>{" "}
                  prověřených zpráv a kontaktů
                </span>
              </div>
            </>
          )}

          <h1 className="text-balance font-sans font-black tracking-tight text-foreground text-4xl sm:text-5xl lg:text-6xl leading-[1.1]">
            Neklikej.{" "}
            <span className="brand-gradient-text">Nejdřív si to ověř.</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Vlož zprávu, číslo, účet nebo e-mail. AI a databáze nahlášených
            podvodů ti do 10 sekund řeknou, čemu věřit.
          </p>
        </section>

        {/* ── Sjednocený vstup (Fáze 3/4) — jediná cesta k ověření ── */}
        <div className="w-full mt-6 relative z-10">
          <ErrorBoundary>
            <OveritClient key={resetSignal} recentIncidents={recentIncidents} />
          </ErrorBoundary>
        </div>

        <ErrorBoundary>
          <HomeSections />
        </ErrorBoundary>
      </main>
    </div>
  );
}
