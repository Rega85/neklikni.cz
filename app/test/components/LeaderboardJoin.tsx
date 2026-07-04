"use client";

import { useEffect, useState } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { savePendingJoin } from "@/lib/quiz/pendingJoin";

// Stejná verze jako app/register/page.tsx a app/profile/page.tsx —
// whitelist na serveru (ACCEPTED_NEWSLETTER_CONSENT_VERSIONS) musí sedět.
const NEWSLETTER_CONSENT_VERSION = "2026-06";

type JoinState = "idle" | "form" | "submitting" | "joined" | "error";

interface LeaderboardJoinProps {
  seed: number;
}

export default function LeaderboardJoin({ seed }: LeaderboardJoinProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [state, setState] = useState<JoinState>("idle");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Dva NEZÁVISLÉ souhlasy, oba defaultně nezaškrtnuté. leaderboardConsent
  // je POVINNÝ pro zápis na žebříček; newsletterConsent je čistě volitelný
  // a nemá na zápis žádný vliv (může být zaškrtnutý sám, nebo vůbec).
  const [leaderboardConsent, setLeaderboardConsent] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false))
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleSubmit() {
    if (!leaderboardConsent || !firstName.trim() || !lastName.trim()) return;

    if (!loggedIn) {
      // Není přihlášen — uložit úmysl a poslat na registraci. Po návratu
      // (viz QuizGame.tsx consumePendingJoin) se dokončí přes /api/test/join.
      savePendingJoin({
        seed,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        newsletterConsent,
        newsletterConsentVersion: NEWSLETTER_CONSENT_VERSION,
      });
      window.location.href = "/register?redirect=/test";
      return;
    }

    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/test/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name_consent: true,
          newsletter_consent: newsletterConsent,
          newsletter_consent_version: NEWSLETTER_CONSENT_VERSION,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Nepodařilo se uložit do žebříčku.");
        setState("error");
        return;
      }
      setDisplayName(data.displayName);
      setState("joined");
    } catch {
      setError("Nepodařilo se uložit do žebříčku.");
      setState("error");
    }
  }

  if (!authChecked) return null;

  if (state === "joined") {
    return (
      <div className="w-full rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-center">
        <Trophy size={16} className="inline text-success mr-1.5 -mt-0.5" />
        Jsi v žebříčku jako <span className="font-semibold">{displayName}</span>!
      </div>
    );
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("form")}
        className="w-full inline-flex items-center justify-center gap-2 border border-border bg-secondary/40 hover:bg-secondary text-foreground font-semibold px-5 py-3 rounded-xl transition-colors"
      >
        <Trophy size={16} /> Chci být v žebříčku nejlepších
      </button>
    );
  }

  const displayNamePreview = `${firstName.trim() || "Jméno"} ${lastName.trim().charAt(0).toUpperCase() || "P"}.`;

  return (
    <div className="w-full rounded-xl border border-border bg-secondary/20 p-4 text-left space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Jméno"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          maxLength={40}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
        <input
          type="text"
          placeholder="Příjmení"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          maxLength={40}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
      <p className="text-[11px] text-muted-foreground -mt-1">
        Na žebříčku se ukážeš jen jako „{displayNamePreview}&quot; — celé příjmení nikam nezveřejníme.
      </p>

      {/* Dva oddělené checkboxy — obě nezaškrtnuté, žádná společná
          "souhlasím se vším" volba. */}
      <label className="flex items-start gap-2.5 text-xs text-foreground/90 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={leaderboardConsent}
          onChange={(e) => setLeaderboardConsent(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 rounded border-border bg-card accent-primary"
        />
        Souhlasím se zobrazením křestního jména a iniciály příjmení na veřejném žebříčku
      </label>

      <label className="flex items-start gap-2.5 text-xs text-foreground/90 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={newsletterConsent}
          onChange={(e) => setNewsletterConsent(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 rounded border-border bg-card accent-primary"
        />
        Chci dostávat upozornění na nové podvody e-mailem (newsletter)
      </label>

      {state === "error" && error && <p className="text-xs text-destructive">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!leaderboardConsent || !firstName.trim() || !lastName.trim() || state === "submitting"}
        className="w-full inline-flex items-center justify-center gap-2 brand-gradient text-primary-foreground font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {state === "submitting" ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
        {loggedIn ? "Uložit do žebříčku" : "Pokračovat na registraci"}
      </button>
    </div>
  );
}
