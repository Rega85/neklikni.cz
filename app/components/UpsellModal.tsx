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
    title: "Dnes už jsi využil 3 zdarma analýzy",
    sub: "Zaregistruj se zdarma pro dalších 5 — nebo si pořiď tarif a měj jistotu vždy.",
  },
  no_credits: {
    title: "Vyčerpal jsi všechny kredity",
    sub: "Doplň si kredity nebo upgraduj na vyšší tarif. Kredity z BASIC/PRO se obnoví automaticky.",
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
          className="absolute top-4 right-4 w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-400/20 px-3 py-1.5 rounded-full w-fit mb-4">
          <Sparkles size={12} /> Pokračuj v ochraně
        </div>

        <h2 id="upsell-title" className="text-2xl sm:text-3xl font-black tracking-tighter mb-2">
          {copy.title}
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">{copy.sub}</p>

        <div className="space-y-2.5">
          {isAnon && (
            <Link
              href="/register"
              onClick={() => trackEvent("cta_upgrade_clicked", { from: "upsell_modal", action: "register" })}
              className="group flex items-center gap-3 surface-card hover:bg-white/[0.04] p-4 transition-all"
            >
              <div className="bg-emerald-500/15 text-emerald-300 p-2.5 rounded-xl shrink-0">
                <Zap size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-sm">Účet zdarma</div>
                <div className="text-slate-400 text-xs">+5 analýz hned, kredity bez expirace</div>
              </div>
              <ArrowRight size={16} className="text-slate-500 group-hover:translate-x-0.5 group-hover:text-white transition-all shrink-0" />
            </Link>
          )}

          <Link
            href="/pricing"
            onClick={() => trackEvent("cta_upgrade_clicked", { from: "upsell_modal", action: "easy", tier })}
            className="group flex items-center gap-3 surface-card hover:bg-white/[0.04] p-4 transition-all"
          >
            <div className="bg-blue-500/15 text-blue-300 p-2.5 rounded-xl shrink-0">
              <Shield size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">EASY — 29 Kč jednorázově</div>
              <div className="text-slate-400 text-xs">10 analýz, žádné předplatné</div>
            </div>
            <ArrowRight size={16} className="text-slate-500 group-hover:translate-x-0.5 group-hover:text-white transition-all shrink-0" />
          </Link>

          <Link
            href="/pricing"
            onClick={() => trackEvent("cta_upgrade_clicked", { from: "upsell_modal", action: "basic", tier })}
            className="group relative flex items-center gap-3 bg-gradient-to-br from-purple-600 to-blue-600 p-4 rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
          >
            <div className="absolute -top-2 right-4 bg-amber-400 text-slate-900 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
              Doporučeno
            </div>
            <div className="bg-white/15 text-white p-2.5 rounded-xl shrink-0">
              <Crown size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm">BASIC — 99 Kč/měs</div>
              <div className="text-white/80 text-xs">50 analýz / měsíc, screenshoty, plný verdikt</div>
            </div>
            <ArrowRight size={16} className="text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          Pokračuju zítra
        </button>
      </div>
    </div>
  );
}
