"use client";

import { useEffect, useState } from "react";
import { RotateCcw, AlertTriangle, Users, Trophy } from "lucide-react";
import type { BuiltQuestion } from "@/lib/quiz/build";
import QuestionCard from "./components/QuestionCard";
import LeaderboardJoin from "./components/LeaderboardJoin";
import ShareButtons from "./components/ShareButtons";
import { consumePendingJoin, type PendingJoin } from "@/lib/quiz/pendingJoin";

type GameState = "loading" | "error" | "playing" | "submitting" | "done";

interface ResultView {
  score: number;
  level: { label: string; emoji: string };
  percentile: number | null;
  totalCompleted: number;
}

interface SubmitResponse extends ResultView {
  perQuestion: { id: string; correct: boolean; correctIndex: number; explanation: string }[];
}

interface JoinResponse extends ResultView {
  joined: boolean;
}

export default function QuizGame() {
  const [state, setState] = useState<GameState>("loading");
  const [seed, setSeed] = useState<number | null>(null);
  const [questions, setQuestions] = useState<BuiltQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<ResultView | null>(null);
  // true jen když se výsledek dostavil přes resume-after-redirect (uživatel
  // se právě vrátil z registrace) — pak už se nenabízí LeaderboardJoin
  // znovu, protože zápis do žebříčku už proběhl.
  const [resumedJoin, setResumedJoin] = useState(false);
  // Social-proof počítadlo před dohráním — jen orientační, autoritativní
  // číslo (result.totalCompleted) je až po submitu/joinu.
  const [preGameCount, setPreGameCount] = useState<number | null>(null);

  useEffect(() => {
    const pending = consumePendingJoin();
    if (pending) {
      resumeJoin(pending);
    } else {
      startGame();
    }
    fetch("/api/test/stats")
      .then((r) => r.json())
      .then((d) => setPreGameCount(typeof d?.totalCompleted === "number" ? d.totalCompleted : null))
      .catch(() => setPreGameCount(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startGame() {
    setState("loading");
    setSeed(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setSelected(null);
    setResult(null);
    setResumedJoin(false);
    try {
      const res = await fetch("/api/test/start", { method: "POST" });
      if (!res.ok) throw new Error("start failed");
      const data = await res.json();
      setSeed(data.seed);
      setQuestions(data.questions);
      setState("playing");
    } catch {
      setState("error");
    }
  }

  // Uživatel se vrátil z registrace/přihlášení s uloženým úmyslem přidat
  // se do žebříčku. Neposíláme odpovědi ani skóre znovu — /api/test/join
  // si skóre přečte ze své krátkodobé cache navázané na seed. Pokud
  // vypršela (viz SEED_TTL_SECONDS na serveru), padáme zpátky na úplně
  // novou hru — férově znovu, žádné tahání starého seedu přes auth flow.
  async function resumeJoin(pending: PendingJoin) {
    setState("loading");
    try {
      const res = await fetch("/api/test/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: pending.seed,
          first_name: pending.firstName,
          last_name: pending.lastName,
          display_name_consent: true,
          newsletter_consent: pending.newsletterConsent,
          newsletter_consent_version: pending.newsletterConsentVersion,
        }),
      });
      const data: JoinResponse & { error?: string } = await res.json();
      if (res.ok && data.joined) {
        setSeed(pending.seed);
        setResult({
          score: data.score,
          level: data.level,
          percentile: data.percentile,
          totalCompleted: data.totalCompleted,
        });
        setResumedJoin(true);
        setState("done");
        return;
      }
    } catch {
      // spadneme do fresh hry níž
    }
    startGame();
  }

  function handleAnswer(index: number) {
    if (selected !== null) return;
    setSelected(index);
  }

  async function handleNext() {
    if (selected === null) return;
    const nextAnswers = [...answers, selected];
    setAnswers(nextAnswers);
    setSelected(null);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      return;
    }

    setState("submitting");
    try {
      const res = await fetch("/api/test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed, answers: nextAnswers }),
      });
      const data: SubmitResponse & { error?: string } = await res.json();
      if (!res.ok) throw new Error(data?.error || "submit failed");
      setResult(data);
      setState("done");
    } catch {
      setState("error");
    }
  }

  let content: React.ReactNode;

  if (state === "loading" || state === "submitting") {
    content = (
      <div className="surface-card p-10 flex flex-col items-center gap-3 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">
          {state === "loading" ? "Připravuji kvíz…" : "Vyhodnocuji odpovědi…"}
        </p>
      </div>
    );
  } else if (state === "error") {
    content = (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 flex flex-col items-center gap-3 text-center">
        <AlertTriangle size={28} className="text-destructive" />
        <p className="text-sm text-foreground/90">Něco se nepovedlo. Zkus to prosím znovu.</p>
        <button
          type="button"
          onClick={startGame}
          className="mt-2 inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <RotateCcw size={16} /> Zkusit znovu
        </button>
      </div>
    );
  } else if (state === "done" && result) {
    content = (
      <div className="surface-card-elevated p-8 flex flex-col items-center gap-4 text-center">
        <span className="text-6xl">{result.level.emoji}</span>
        <div>
          <p className="text-3xl font-bold text-foreground">{result.score} / 10</p>
          <p className="text-lg font-semibold text-primary mt-1">{result.level.label}</p>
        </div>

        {/* Percentil jen když má leaderboard dost záznamů (viz
            MIN_LEADERBOARD_ROWS_FOR_PERCENTILE) — server vrátí null,
            dokud je žebříček skoro prázdný. Žádný náhradní text, řádek
            se prostě nevykreslí — elegantní fallback, ne díra. */}
        {result.percentile !== null && (
          <p className="text-base font-semibold text-foreground/90 -mt-1">
            Porazil/a jsi <span className="text-primary">{result.percentile} %</span> testovaných
          </p>
        )}

        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full">
          <Users size={13} />
          Už se otestovalo {result.totalCompleted.toLocaleString("cs-CZ")} lidí
        </div>

        <ShareButtons score={result.score} />

        {resumedJoin ? (
          <div className="w-full rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm">
            <Trophy size={16} className="inline text-success mr-1.5 -mt-0.5" />
            Vítej zpět! Tvůj výsledek je v žebříčku.
          </div>
        ) : (
          seed !== null && <LeaderboardJoin seed={seed} />
        )}

        <button
          type="button"
          onClick={startGame}
          className="mt-2 inline-flex items-center gap-2 brand-gradient text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
        >
          <RotateCcw size={16} /> Hrát znovu
        </button>
      </div>
    );
  } else {
    const question = questions[currentIndex];
    content = question ? (
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-muted-foreground">
            Otázka {currentIndex + 1} / {questions.length}
          </span>
          <div className="flex gap-1" aria-hidden="true">
            {questions.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-4 rounded-full ${i <= currentIndex ? "bg-primary" : "bg-secondary"}`}
              />
            ))}
          </div>
        </div>
        <QuestionCard
          question={question}
          selected={selected}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLast={currentIndex === questions.length - 1}
        />
      </div>
    ) : null;
  }

  return (
    <div>
      {/* Social-proof počítadlo nad hraním — na výsledkové kartě je vlastní
          (autoritativní) čítač, tady se proto nezdvojuje. */}
      {state !== "done" && preGameCount !== null && (
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-full">
            <Users size={13} />
            Už se otestovalo {preGameCount.toLocaleString("cs-CZ")} lidí
          </div>
        </div>
      )}
      {content}
    </div>
  );
}
