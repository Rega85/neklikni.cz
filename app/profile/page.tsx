"use client";


import { useEffect, useState } from "react";
import { Loader2, CreditCard, Zap, Gift, Copy, Check, FileText, Mail } from "lucide-react";
import Link from "next/link";
import { CATEGORY_LABELS, type IncidentCategory } from "@/types/databaze";

// Stejná verze jako v app/register/page.tsx a app/onboarding/newsletter/page.tsx.
const NEWSLETTER_CONSENT_VERSION = "2026-06";

interface MyIncident {
  id: string;
  incident_date: string;
  category: IncidentCategory;
  category_other: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{user: any, profile: any} | null>(null);
  const [copied, setCopied] = useState(false);
  const [myIncidents, setMyIncidents] = useState<MyIncident[] | null>(null);
  const [newsletterOn, setNewsletterOn] = useState(false);
  const [newsletterSyncing, setNewsletterSyncing] = useState(false);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setData(d);
        if (d?.profile) setNewsletterOn(!!d.profile.newsletter_consent);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/databaze/my-incidents', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setMyIncidents(d?.incidents ?? []))
      .catch(() => setMyIncidents([]));
  }, []);

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

  async function toggleNewsletter() {
    if (newsletterSyncing) return;
    const next = !newsletterOn;
    setNewsletterSyncing(true);
    try {
      const res = await fetch('/api/profile/newsletter-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: next, consent_version: NEWSLETTER_CONSENT_VERSION }),
      });
      if (res.ok) setNewsletterOn(next);
    } catch {
      // necháme newsletterOn beze změny — uživatel uvidí, že se přepínač nehnul
    } finally {
      setNewsletterSyncing(false);
    }
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
            <CreditCard size={32} className="text-blue-500" />
          </div>
          {maxCredits > 0 && (
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (credits / maxCredits) * 100)}%` }} />
            </div>
          )}
          <Link href="/pricing" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase py-3 rounded-xl transition-colors">
            <Zap size={14} fill="currentColor" /> Koupit kredity
          </Link>
        </div>

        {myIncidents && myIncidents.length > 0 && (
          <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-blue-400" />
              <p className="text-white font-black uppercase tracking-widest text-sm">Tvoje nahlášení</p>
            </div>
            <ul className="divide-y divide-white/10">
              {myIncidents.map((incident) => (
                <li key={incident.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {incident.category === "other" && incident.category_other
                        ? incident.category_other
                        : CATEGORY_LABELS[incident.category] ?? incident.category}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {new Date(incident.created_at).toLocaleDateString("cs-CZ")}
                    </p>
                  </div>
                  <Link
                    href={`/databaze/pripad/${incident.id}`}
                    className="text-blue-400 text-xs font-bold uppercase shrink-0 hover:text-blue-300"
                  >
                    Zobrazit
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail size={20} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-white font-black uppercase tracking-widest text-sm">Newsletter</p>
                <p className="text-slate-400 text-xs mt-0.5">Tipy a upozornění na nové podvody e-mailem.</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={newsletterOn}
              onClick={toggleNewsletter}
              disabled={newsletterSyncing}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${newsletterOn ? "bg-blue-600" : "bg-slate-700"}`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${newsletterOn ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>

        {referralCode && (
          <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Gift size={20} className="text-blue-400" />
              <p className="text-white font-black uppercase tracking-widest text-sm">Získej analýzy zdarma</p>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sdílej svůj unikátní odkaz. Každý, kdo se přes něj zaregistruje, dostane <span className="text-white font-bold">+5 analýz</span> — a ty také.
            </p>
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">Tvůj referral odkaz</p>
              <div className="flex items-center gap-2 bg-slate-800 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-blue-300 text-sm font-mono flex-1 truncate">{referralLink}</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-black uppercase text-white bg-blue-600 hover:bg-blue-700 transition-colors px-3 py-1.5 rounded-lg shrink-0"
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
