"use client";

/**
 * Konverzní okno pro 429 AI_LIMIT_REACHED z POST /api/check.
 *
 * Primární CTA vede na /pricing?plan=oneshot (auto-checkout, viz
 * PricingPage useEffect na ?plan=). Sekundární "Full" CTA vede na
 * obecné /pricing — měsíčně/ročně + 7denní trial je rozhodnutí, které
 * si uživatel zaslouží vidět celé na stránce, ne slepý auto-redirect
 * do checkoutu s trial závazkem.
 */

import Link from "next/link";
import { Zap, Crown, ArrowRight, Search } from "lucide-react";
import { trackEvent } from "@/app/lib/analytics";

interface Props {
  message?: string;
}

export default function LimitReachedCard({ message }: Props) {
  return (
    <div
      data-testid="limit-reached-card"
      className="rounded-[32px] border-2 border-warning/30 bg-card backdrop-blur-3xl shadow-2xl p-6 sm:p-8 text-center space-y-5"
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Dnešní ověření zdarma jsi vyčerpal.
        </h2>
        {message && <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{message}</p>}
      </div>

      <Link
        href="/pricing?plan=oneshot"
        onClick={() => trackEvent("cta_upgrade_clicked", { from: "overit_limit", action: "oneshot" })}
        className="group flex items-center justify-center gap-2.5 rounded-2xl bg-primary hover:brightness-110 px-6 py-4 text-base font-black text-primary-foreground shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
      >
        <Zap size={18} /> Jednorázová analýza za 49 Kč
        <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* TODO(cenik): Full 79 Kč/měsíc — Stripe produkt nového ceníku
          zatím neexistuje. Odkaz míří obecně na /pricing, dokud plán
          nevznikne. BLOKUJE Fázi 4. */}
      <Link
        href="/pricing"
        onClick={() => trackEvent("cta_upgrade_clicked", { from: "overit_limit", action: "full" })}
        className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Crown size={14} /> nebo neomezené ověřování za 79 Kč/měsíc
      </Link>

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground border-t border-border pt-4">
        <Search size={12} /> Vyhledávání v databázi máš dál zdarma.
      </p>
    </div>
  );
}
