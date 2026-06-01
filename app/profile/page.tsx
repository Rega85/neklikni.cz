"use client";


import { useEffect, useState } from "react";
import { Loader2, CreditCard, Zap, Gift, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{user: any, profile: any} | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-purple-500" size={32} />
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

  const { user, profile } = data;
  const tier = profile.tier || "free";
  const credits = profile.credits_remaining ?? 0;
  const maxCredits = tier === "pro" ? 200 : tier === "basic" ? 50 : tier === "easy" ? 10 : 0;
  const referralCode = profile.referral_code as string | null;
  const referralLink = referralCode ? `https://neklikni.cz/?ref=${referralCode}` : null;

  function handleCopy() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-28 px-4 sm:px-6 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Můj Profil</h1>
        <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl space-y-4">
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">E-mail</p>
            <p className="text-white font-bold">{user.email}</p>
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Tarif</p>
            <p className="text-white font-black text-2xl">{tier.toUpperCase()}</p>
          </div>
        </div>
        <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Zbývající kredity</p>
              <p className="text-white font-black text-4xl">{credits.toLocaleString("cs-CZ")}</p>
            </div>
            <CreditCard size={32} className="text-purple-500" />
          </div>
          {maxCredits > 0 && (
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, (credits / maxCredits) * 100)}%` }} />
            </div>
          )}
          <Link href="/pricing" className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase py-3 rounded-xl transition-colors">
            <Zap size={14} fill="currentColor" /> Koupit kredity
          </Link>
        </div>
        {referralCode && (
          <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Gift size={20} className="text-purple-400" />
              <p className="text-white font-black uppercase tracking-widest text-sm">Získej analýzy zdarma</p>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sdílej svůj unikátní odkaz. Každý, kdo se přes něj zaregistruje, dostane <span className="text-white font-bold">+5 analýz</span> — a ty také.
            </p>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Tvůj referral odkaz</p>
              <div className="flex items-center gap-2 bg-slate-800 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-purple-300 text-sm font-mono flex-1 truncate">{referralLink}</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-black uppercase text-white bg-purple-600 hover:bg-purple-700 transition-colors px-3 py-1.5 rounded-lg shrink-0"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Zkopírováno" : "Kopírovat"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
