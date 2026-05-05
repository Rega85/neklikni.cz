"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Check, Gift, Users, Sparkles, ArrowRight, MessageCircle, Facebook } from "lucide-react";
import { trackEvent } from "../lib/analytics";

type ReferralData = {
  code: string | null;
  referredCount: number;
  bonusCreditsEarned: number;
};

export default function ReferralPage() {
  const router = useRouter();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/login?next=/referral");
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const link = data?.code
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.neklikni.cz"}/?ref=${data.code}`
    : "";

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    trackEvent("cta_share_clicked", { method: "copy", from: "referral" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        <div className="text-center space-y-4 mb-10 animate-fade-up">
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-300 bg-purple-500/10 border border-purple-400/20 px-3 py-1.5 rounded-full">
            <Sparkles size={12} /> Referrální program
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">
            Pozvi přátele,{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              dostaň kredity
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
            Za každou registraci přes tvůj odkaz dostaneš <span className="text-emerald-400 font-bold">+5 kreditů</span>.
            A nový uživatel taky. Win-win.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10 animate-fade-up">
          <div className="surface-card p-5 sm:p-6 text-center">
            <Users className="mx-auto text-purple-300 mb-2" size={22} />
            <div className="text-3xl sm:text-4xl font-black tabular-nums">
              {loading ? "—" : data?.referredCount ?? 0}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">
              registrovaných přátel
            </div>
          </div>
          <div className="surface-card p-5 sm:p-6 text-center">
            <Gift className="mx-auto text-emerald-300 mb-2" size={22} />
            <div className="text-3xl sm:text-4xl font-black tabular-nums text-emerald-300">
              {loading ? "—" : `+${data?.bonusCreditsEarned ?? 0}`}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">
              získaných kreditů
            </div>
          </div>
        </div>

        {/* Link card */}
        <div className="surface-card-elevated p-6 sm:p-8 mb-10 animate-fade-up">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Tvůj osobní odkaz</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              readOnly
              value={loading ? "Načítám…" : link || "Žádný kód"}
              className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm select-all focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              disabled={!link}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-5 py-3 rounded-xl font-black text-sm shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {copied ? (
                <><Check size={16} /> Zkopírováno</>
              ) : (
                <><Copy size={16} /> Kopírovat odkaz</>
              )}
            </button>
          </div>

          {link && (
            <div className="flex flex-wrap gap-2.5 mt-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Tohle se ti bude hodit — Neklikni.cz prověří podezřelé SMS a e-maily během 3 sekund. Zaregistruj se přes můj odkaz a oba dostaneme +5 kreditů: ${link}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("cta_share_clicked", { method: "whatsapp", from: "referral" })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all active:scale-95"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("cta_share_clicked", { method: "facebook", from: "referral" })}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all active:scale-95"
              >
                <Facebook size={14} /> Facebook
              </a>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="surface-card p-6 sm:p-8 animate-fade-up">
          <h2 className="text-xl font-black tracking-tighter mb-5">Jak to funguje</h2>
          <ol className="space-y-4">
            {[
              { n: 1, t: "Pošli odkaz", d: "Sdílej svůj osobní link s rodinou nebo přáteli." },
              { n: 2, t: "Oni se zaregistrují", d: "Klikem na odkaz a dokončením registrace zdarma." },
              { n: 3, t: "Oba získáte +5 kreditů", d: "Připíšou se automaticky po jejich přihlášení. Žádné limity." },
            ].map((s) => (
              <li key={s.n} className="flex gap-4">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-lg shadow-purple-500/30">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-white">{s.t}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <Link
            href="/pricing"
            className="group inline-flex items-center gap-2 mt-6 text-purple-300 hover:text-purple-200 text-sm font-bold transition-colors"
          >
            Nebo si rovnou pořiď tarif
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
}
