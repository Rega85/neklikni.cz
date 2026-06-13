"use client";

import { useEffect, useState } from "react";
import { Loader2, CreditCard, Zap, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [data, setData] = useState<{user: any, profile: any} | null>(null);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const payload = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok) {
        const msg = payload?.error || `Chyba ${res.status}. Zkus to prosím znovu nebo nás kontaktuj.`;
        console.error("Portal request failed:", res.status, payload);
        setPortalError(msg);
        return;
      }
      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }
      console.error("Portal response missing url:", payload);
      setPortalError("Server nevrátil URL portálu. Zkus to prosím znovu.");
    } catch (err) {
      console.error("Portal request exception:", err);
      setPortalError("Nepodařilo se spojit se serverem. Zkontroluj připojení a zkus to znovu.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  if (!data?.profile) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
      <div className="text-center space-y-4">
        <p className="text-slate-400">Nejste přihlášeni.</p>
        <Link href="/login" className="bg-white text-black px-6 py-2 rounded-lg font-black text-xs">PŘIHLÁSIT SE</Link>
      </div>
    </div>
  );

  const tier = data.profile.tier || "free";

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-28 px-4 sm:px-6 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Fakturace & Předplatné</h1>

        <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Aktuální tarif</p>
              <p className="text-white font-black text-2xl">{tier.toUpperCase()}</p>
            </div>
            <CreditCard size={32} className="text-blue-500" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Zbývající kredity</p>
            <p className="text-white font-black text-2xl">{(data.profile.credits_remaining ?? 0).toLocaleString("cs-CZ")}</p>
          </div>
        </div>

        <Link href="/pricing" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase py-4 rounded-2xl transition-colors">
          <Zap size={16} fill="currentColor" /> Změnit tarif nebo dobít
        </Link>

        <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
          <p className="text-slate-400 text-sm leading-relaxed">Faktury, historii plateb a nastavení platební karty spravujeme bezpečně přes službu Stripe.</p>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-sm transition-colors disabled:opacity-50"
          >
            {portalLoading ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
            Spravovat platby ve Stripe
          </button>
          {portalError && (
            <div
              role="alert"
              className="w-full bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300 text-left"
            >
              {portalError}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
