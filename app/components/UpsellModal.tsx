"use client";

import { X, Sparkles, Zap, Shield, Crown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { trackEvent } from "../lib/analytics";

type Reason = "anon_daily" | "no_credits" | null;

type Props = {
  reason: Reason;
  onClose: () => void;
  /** "free" | "easy" | "basic" | "pro" | undefined */
  tier?: string;
};

const COPY: Record<Exclude<Reason, null>, { title: string; sub: string }> = {
  anon_daily: {
    title: "Dnes už jsi využil zdarma analýzy",
    sub: "Zaregistruj se zdarma pro dalších 5 — nebo si pořiď tarif a měj jistotu vždy.",
  },
  no_credits: {
    title: "Vyčerpal jsi všechny analýzy",
    sub: "Doplň si analýzy nebo upgraduj na vyšší tarif. Analýzy z BASIC/PRO se obnoví automaticky.",
  },
};

export default function UpsellModal({ reason, onClose, tier }: Props) {
  if (!reason) return null;
  const copy = COPY[reason];
  const isAnon = reason === "anon_daily";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-title"
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-card-elevated w-full max-w-lg p-6 sm:p-8 relative animate-scale-in"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Zavřít"
          className="absolute top-4 right-4 w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary bg-card border border-border px-3 py-1.5 rounded-full w-fit mb-4">
          <Sparkles size={12} /> Pokračuj v ochraně
        </div>

        <h2 id="upsell-title" className="text-2xl sm:text-3xl font-black tracking-tighter mb-2">
          {copy.title}
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-6">{copy.sub}</p>

        <div className="space-y-2.5">
          {isAnon && (
            <Link
              href="/register"
              onClick={() => trackEvent("cta_upgrade_clicked", { from: "upsell_modal", action: "register" })}
              className="group flex items-center gap-3 surface-card hover:bg-secondary/40 p-4 transition-all"
            >
              <div className="bg-success/15 text-success p-2.5 rounded-xl shrink-0">
                <Zap size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-foreground font-bold text-sm">Účet zdarma</div>
                <div className="text-muted-foreground text-xs">+5 analýz hned, bez expirace</div>
              </div>
              <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
            </Link>
          )}

          <Link
            href="/pricing"
            onClick={() => trackEvent("cta_upgrade_clicked", { from: "upsell_modal", action: "oneshot", tier })}
            className="group flex items-center gap-3 surface-card hover:bg-secondary/40 p-4 transition-all"
          >
            <div className="bg-primary/10 text-primary p-2.5 rounded-xl shrink-0">
              <Shield size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-foreground font-bold text-sm">JEDNORÁZOVÁ — 49 Kč</div>
              <div className="text-muted-foreground text-xs">1 prémiová analýza modelem Opus</div>
            </div>
            <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground transition-all shrink-0" />
          </Link>

          <Link
            href="/pricing"
            onClick={() => trackEvent("cta_upgrade_clicked", { from: "upsell_modal", action: "basic", tier })}
            className="group relative flex items-center gap-3 bg-primary p-4 rounded-2xl shadow-lg shadow-primary/30 transition-all"
          >
            <div className="absolute -top-2 right-4 bg-warning text-warning-foreground text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              Doporučeno
            </div>
            <div className="bg-primary-foreground/15 text-primary-foreground p-2.5 rounded-xl shrink-0">
              <Crown size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-foreground font-bold text-sm">BASIC — 99 Kč/měs</div>
              <div className="text-primary-foreground/80 text-xs">50 analýz / měsíc, screenshoty, plný verdikt</div>
            </div>
            <ArrowRight size={16} className="text-primary-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          Pokračuju zítra
        </button>
      </div>
    </div>
  );
}
