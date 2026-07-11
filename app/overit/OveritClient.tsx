"use client";

/**
 * Orchestrátor /overit — state machine (idle → loading → result |
 * limitReached | error) + fetch POST /api/check. Karty a vstup jsou
 * v _components/, tenhle soubor jen drží stav a síťové volání.
 */

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import AnalysisScanner from "@/app/components/AnalysisScanner";
import { trackEvent } from "@/app/lib/analytics";
import CheckInput from "./_components/CheckInput";
import VerdictCard, { type VerdictCardProps } from "./_components/VerdictCard";
import LimitReachedCard from "./_components/LimitReachedCard";

type Status = "idle" | "loading" | "result" | "limitReached" | "error";

const LOADING_MESSAGES = ["Rozpoznávám vstup…", "Kontroluji databázi…", "Analyzuji AI…"];

export default function OveritClient() {
  const [status, setStatus] = useState<Status>("idle");
  const [lastText, setLastText] = useState("");
  const [result, setResult] = useState<VerdictCardProps | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");

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
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {(status === "idle" || status === "loading") && (
        <CheckInput onSubmit={runCheck} disabled={status === "loading"} />
      )}

      {status === "loading" && <AnalysisScanner messages={LOADING_MESSAGES} />}

      {status === "error" && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-3">
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
        <>
          <VerdictCard {...result} />
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Ověřit něco dalšího
          </button>
        </>
      )}

      {status === "limitReached" && (
        <>
          <LimitReachedCard message={limitMessage} />
          <button
            type="button"
            onClick={handleReset}
            className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Zpět
          </button>
        </>
      )}
    </div>
  );
}
