"use client";

/**
 * Orchestrátor /overit — state machine (idle → loading → result |
 * limitReached | error) + fetch POST /api/check. Karty a vstup jsou
 * v _components/, tenhle soubor drží stav, síťové volání a layout.
 *
 * Layout: CSS grid `md:grid-cols-2` dělá dvě práce najednou —
 *  - na desktopu (md+) je to skutečný split (vlevo vstup sticky,
 *    vpravo klidový panel / výsledek)
 *  - pod `md` grid defaultně spadne na jeden sloupec → stejný DOM
 *    strom se na mobilu vykreslí jako vstup nahoře, výsledek pod ním
 * Žádná duplicitní mobile/desktop varianta komponent.
 *
 * CheckInput zůstává SMONTOVANÝ přes všechny stavy (nemizí při
 * loading/result jako v předchozí verzi) — "sticky, zůstává
 * viditelné" ze zadání. Reset (`key={resetCount}`) vynutí remount
 * a vyčistí vnitřní stav textarea, aniž by input zmizel z DOM.
 */

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import AnalysisScanner from "@/app/components/AnalysisScanner";
import { trackEvent } from "@/app/lib/analytics";
import type { RecentIncidentCard } from "@/app/databaze/_lib/recentIncidents";
import CheckInput from "./_components/CheckInput";
import VerdictCard, { type VerdictCardProps } from "./_components/VerdictCard";
import LimitReachedCard from "./_components/LimitReachedCard";
import RecentIncidentsPanel from "./_components/RecentIncidentsPanel";

type Status = "idle" | "loading" | "result" | "limitReached" | "error";

const LOADING_MESSAGES = ["Rozpoznávám vstup…", "Kontroluji databázi…", "Analyzuji AI…"];
// Tailwind `md` breakpoint (768px) — pod touhle šířkou je layout jeden sloupec.
const MOBILE_QUERY = "(max-width: 767px)";

interface Props {
  recentIncidents: RecentIncidentCard[];
}

export default function OveritClient({ recentIncidents }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [lastText, setLastText] = useState("");
  const [result, setResult] = useState<VerdictCardProps | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetCount, setResetCount] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  // Po přijetí odpovědi (ne v idle/loading) na mobilu auto-scroll na
  // výsledek — uživatel nesmí hledat, kde odpověď je. Na desktopu (split
  // layout) je výsledek rovnou vidět v pravém sloupci, scroll by tam jen
  // rušil.
  useEffect(() => {
    if (status === "idle" || status === "loading") return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status]);

  async function runCheck(text: string) {
    setLastText(text);
    setStatus("loading");
    setErrorMsg("");
    trackEvent("check_started");

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server neodpověděl. Možná je přetížen, zkuste to znovu.");
      }
      const data = await res.json();

      if (res.status === 429 && data.code === "AI_LIMIT_REACHED") {
        setLimitMessage(data.message);
        setStatus("limitReached");
        trackEvent("check_limit_reached");
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error || "Něco se pokazilo. Zkuste to znovu.");
        setStatus("error");
        return;
      }

      setResult(data as VerdictCardProps);
      setStatus("result");
      trackEvent("check_completed", { level: data.level, inputKind: data.inputKind });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Nepodařilo se připojit k serveru.");
      setStatus("error");
    }
  }

  function handleRetry() {
    if (lastText) runCheck(lastText);
  }

  function handleReset() {
    setStatus("idle");
    setResult(null);
    setLimitMessage(undefined);
    setErrorMsg("");
    setResetCount((n) => n + 1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="w-full max-w-md md:max-w-6xl mx-auto grid md:grid-cols-2 gap-5 md:gap-8 items-start">
      {/* ── Levý sloupec — vstup, sticky na desktopu ── */}
      <div className="md:sticky md:top-24">
        <CheckInput key={resetCount} onSubmit={runCheck} disabled={status === "loading"} />
      </div>

      {/* ── Pravý sloupec (na mobilu pod vstupem) — klidový stav / výsledek ── */}
      <div ref={resultRef} className="scroll-mt-24">
        {status === "idle" && recentIncidents.length > 0 && (
          <div className="hidden md:block animate-fade-up">
            <RecentIncidentsPanel incidents={recentIncidents} />
          </div>
        )}

        {status === "loading" && (
          <div className="animate-fade-up">
            <AnalysisScanner messages={LOADING_MESSAGES} />
          </div>
        )}

        {status === "error" && (
          <div className="animate-fade-up rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-3">
            <p className="text-sm text-destructive">{errorMsg}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-xl bg-destructive/15 hover:bg-destructive/25 px-4 py-2.5 text-sm font-bold text-destructive transition-colors"
            >
              <RotateCcw size={14} /> Zkusit znovu
            </button>
          </div>
        )}

        {status === "result" && result && (
          <div className="animate-fade-up space-y-4">
            <VerdictCard {...result} />
            <button
              type="button"
              onClick={handleReset}
              className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Ověřit něco dalšího
            </button>
          </div>
        )}

        {status === "limitReached" && (
          <div className="animate-fade-up space-y-4">
            <LimitReachedCard message={limitMessage} />
            <button
              type="button"
              onClick={handleReset}
              className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Zpět
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
