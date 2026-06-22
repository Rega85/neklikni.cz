"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, ArrowRight } from "lucide-react";

// Stejná verze jako NEWSLETTER_CONSENT_VERSION v app/register/page.tsx a
// ACCEPTED_NEWSLETTER_CONSENT_VERSIONS v app/auth/callback/route.ts.
// Bump na všech třech místech najednou při změně textu checkboxu.
const NEWSLETTER_CONSENT_VERSION = "2026-06";

export default function NewsletterOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const rawNext = searchParams.get("next") ?? "/";
  const safeNext = /^\/[^/\\]/.test(rawNext) || rawNext === "/" ? rawNext : "/";

  async function handleContinue() {
    setLoading(true);
    try {
      await fetch("/api/profile/newsletter-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent, consent_version: NEWSLETTER_CONSENT_VERSION }),
      });
    } catch {
      // Selhání zápisu nesmí uživatele zaseknout na onboardingu — gate
      // (onboarding_newsletter_shown) je už nastavený v /auth/callback,
      // takže se modal příště znovu neukáže ani při chybě.
    } finally {
      router.push(safeNext);
    }
  }

  function handleSkip() {
    // Žádný API call — newsletter_consent zůstává na DB defaultu (false).
    router.push(safeNext);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md surface-card p-8 rounded-3xl space-y-5">
        <div className="bg-primary/10 text-primary w-12 h-12 rounded-2xl flex items-center justify-center">
          <Mail size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Ještě jedna věc</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Chceš dostávat občasné tipy a upozornění na nové podvody e-mailem?
            Odhlásit se můžeš kdykoli.
          </p>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-foreground leading-relaxed cursor-pointer select-none bg-secondary/40 border border-border rounded-xl p-4">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={loading}
            className="mt-0.5 w-4 h-4 shrink-0 rounded border-border bg-card text-primary accent-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 cursor-pointer"
          />
          <span>
            Chci dostávat občasné tipy a upozornění na nové podvody e-mailem.{" "}
            <a
              href="/gdpr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline underline-offset-2"
            >
              Zásady ochrany osobních údajů
            </a>
            .
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-primary hover:brightness-110 text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? "Ukládám…" : <>Pokračovat <ArrowRight size={20} /></>}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="w-full text-muted-foreground hover:text-foreground text-sm font-medium py-2 transition-colors disabled:opacity-50"
          >
            Přeskočit
          </button>
        </div>
      </div>
    </div>
  );
}
