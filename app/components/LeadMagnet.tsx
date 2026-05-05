"use client";

import { useState } from "react";
import { Mail, Download, Check, AlertTriangle } from "lucide-react";
import { trackEvent } from "../lib/analytics";

export default function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "loading" || state === "success") return;
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "homepage_pdf" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.error || "Něco se pokazilo");
        setState("error");
        return;
      }
      trackEvent("lead_magnet_submitted", { source: "homepage_pdf" });
      setState("success");
    } catch {
      setErrorMsg("Nepodařilo se odeslat. Zkus to znovu.");
      setState("error");
    }
  };

  return (
    <section className="surface-card-elevated p-6 sm:p-10 animate-fade-up">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-300 w-14 h-14 rounded-2xl flex items-center justify-center">
            <Download size={26} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">
            Stáhni si zdarma:{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              10 nejčastějších českých podvodů 2026
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Reálné ukázky SMS, e-mailů a fake stránek, které kolovaly v Česku — s vysvětlením, podle čeho je poznáš.
            Pošli si na e-mail PDF zdarma a měj přehled.
          </p>
          <ul className="text-sm text-slate-300 space-y-1.5">
            <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Falešná Česká pošta, ČSOB, FÚ a další</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Konkrétní fráze a typografie útočníků</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Žádný spam, kdykoli se odhlásíš</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 sm:p-6 space-y-3">
          {state === "success" ? (
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Check size={26} />
              </div>
              <h3 className="text-lg font-black">Hotovo!</h3>
              <p className="text-slate-400 text-sm">
                PDF dorazí na <span className="text-white font-bold">{email}</span> během několika minut.
                Zkontroluj i složku Spam.
              </p>
            </div>
          ) : (
            <>
              <label htmlFor="lead-email" className="block text-xs font-black uppercase tracking-widest text-slate-400">
                Tvůj e-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="lead-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="napr@email.cz"
                  disabled={state === "loading"}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-400/40 transition-colors disabled:opacity-60"
                />
              </div>

              {state === "error" && (
                <div role="alert" className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={state === "loading"}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Download size={16} /> {state === "loading" ? "Odesílám…" : "Poslat PDF"}
              </button>

              <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                Odesláním souhlasíš se{" "}
                <a href="/gdpr" className="underline hover:text-slate-300">zpracováním osobních údajů</a>. Žádný spam, kdykoli se odhlásíš.
              </p>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
