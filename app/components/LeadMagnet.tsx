"use client";

import { useState } from "react";
import { Mail, Download, Check, AlertTriangle } from "lucide-react";
import { trackEvent } from "../lib/analytics";

// Verze znění souhlasu vedle checkboxu níže. Posílá se s POST /api/lead
// a perzistuje v leads.consent_version. Bump při jakékoli změně textu.
const LEAD_CONSENT_VERSION = "2026-05";

export default function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "loading" || state === "success") return;
    if (!consent) return;
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "homepage_pdf",
          consent,
          consent_version: LEAD_CONSENT_VERSION,
        }),
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
    <section className="surface-card-elevated p-6 sm:p-10 animate-fade-up overflow-hidden">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          {/* 3D book mockup */}
          <div className="flex items-end gap-4 mb-2">
            <div
              className="relative shrink-0"
              style={{ perspective: "700px", width: "104px", height: "140px" }}
              aria-hidden="true"
            >
              <div
                className="absolute inset-0 rounded-r-md rounded-l-sm shadow-2xl shadow-amber-900/50"
                style={{
                  transform: "rotateY(-22deg) translateZ(0)",
                  transformStyle: "preserve-3d",
                  transformOrigin: "left center",
                  background:
                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
                }}
              >
                {/* Spine */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-800 to-amber-950 rounded-l-sm"
                />
                {/* Cover content */}
                <div className="absolute inset-0 pl-3 pr-2 py-3 flex flex-col justify-between">
                  <div>
                    <div
                      className="text-slate-900 font-black leading-none"
                      style={{ fontSize: "44px", letterSpacing: "-0.05em" }}
                    >
                      10
                    </div>
                    <div className="text-slate-900/80 text-[7px] font-black uppercase tracking-widest mt-1 leading-tight">
                      Nejčastějších
                    </div>
                    <div className="text-slate-900/80 text-[7px] font-black uppercase tracking-widest leading-tight">
                      podvodů
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-900 text-xs font-black border-t border-slate-900/30 pt-1 inline-block">
                      2026
                    </div>
                    <div className="text-slate-900/70 text-[6px] font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-red-600 rounded-full" />
                      NeKlikni.cz
                    </div>
                  </div>
                </div>
                {/* Glossy highlight */}
                <div
                  className="absolute inset-0 rounded-r-md rounded-l-sm pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(115deg, rgba(255,255,255,0.25) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.15) 100%)",
                  }}
                />
              </div>
            </div>

            <div className="bg-primary/10 text-primary w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
              <Download size={22} />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">
            Stáhni si zdarma:{" "}
            <span className="text-primary">
              10 nejčastějších českých podvodů 2026
            </span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Reálné ukázky SMS, e-mailů a fake stránek, které kolovaly v Česku — s vysvětlením, podle čeho je poznáš.
            Pošli si na e-mail PDF zdarma a měj přehled.
          </p>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2"><Check size={14} className="text-success shrink-0" /> Falešná Česká pošta, ČSOB, FÚ a další</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-success shrink-0" /> Konkrétní fráze a typografie útočníků</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-success shrink-0" /> Žádný spam, kdykoli se odhlásíš</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="bg-secondary/40 border border-border rounded-2xl p-5 sm:p-6 space-y-3">
          {state === "success" ? (
            <div className="flex flex-col items-center text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-success/15 text-success flex items-center justify-center">
                <Check size={26} />
              </div>
              <h3 className="text-lg font-black">Hotovo!</h3>
              <p className="text-muted-foreground text-sm">
                PDF dorazí na <span className="text-foreground font-bold">{email}</span> během několika minut.
                Zkontroluj i složku Spam.
              </p>
            </div>
          ) : (
            <>
              <label htmlFor="lead-email" className="block text-xs font-black uppercase tracking-widest text-muted-foreground">
                Tvůj e-mail
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                  className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-60"
                />
              </div>

              {state === "error" && (
                <div role="alert" className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <label className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={state === "loading"}
                  className="mt-0.5 w-4 h-4 shrink-0 rounded border-border bg-card text-primary accent-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 cursor-pointer"
                />
                <span>
                  Souhlasím se zasláním PDF a občasných tipů o podvodech na e-mail. Odhlásit se můžeš kdykoli.{" "}
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

              <button
                type="submit"
                disabled={state === "loading" || !consent}
                aria-disabled={state === "loading" || !consent}
                className="w-full bg-primary hover:brightness-110 text-primary-foreground py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <Download size={16} /> {state === "loading" ? "Odesílám…" : "Poslat PDF"}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
