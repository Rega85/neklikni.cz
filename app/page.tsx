"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Zap, Info, Shield, AlertTriangle, CheckCircle, Share2, Check, X, Copy, Camera, Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type AnalysisResult = {
  risk: number;
  verdict: string;
  analysis: string;
  threats: string[];
  tactics?: string[];
  recommendation: string;
  shareId?: string;
  credits?: number;
  tier?: string;
  remainingChecks?: number;
  limitReached?: boolean;
};

export default function Home() {
  const [supabase] = useState(() => createClient());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [ctaCopied, setCtaCopied] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Bookmarklet handler - přečte ?q= parametr z URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");
    if (query) {
      setInput(query);
      window.history.replaceState({}, '', '/');
    }

    try {
      const cached = localStorage.getItem("neklikni_total");
      if (cached) setTotalAnalyses(parseInt(cached, 10));
    } catch {}

    fetch('/api/stats', { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const total = d.total ?? null;
        if (total !== null) {
          setTotalAnalyses(total);
          try { localStorage.setItem("neklikni_total", String(total)); } catch {}
        }
      })
      .catch(() => {});

    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.profile) setProfile(d.profile); })
      .catch(() => {});
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("Obrázek je příliš velký. Maximum jsou 4 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setImage(b64);
      setImagePreview(b64);
      setInput("");
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalysis = useCallback(async () => {
    if ((!input.trim() && !image) || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image ? { image } : { text: input }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server neodpověděl. Možná je přetížen, zkuste to znovu.");
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.limitReached) setError(data.message || "Denní limit vyčerpán.");
        else if (res.status === 402) setError(data.message || "Nedostatek kreditů.");
        else setError(data.error || "Něco se pokazilo. Zkuste to znovu.");
        return;
      }

      setResult(data);
      window.dispatchEvent(new CustomEvent("creditsUpdated"));

      setTotalAnalyses((prev) => {
        const next = prev !== null ? prev + 1 : null;
        if (next !== null) {
          try { localStorage.setItem("neklikni_total", String(next)); } catch {}
        }
        return next;
      });
    } catch (err: any) {
      setError(err.message || "Nepodařilo se připojit k serveru.");
    } finally {
      setLoading(false);
    }
  }, [input, image, loading]);

  const handleClear = () => { setInput(""); setResult(null); setError(null); setImage(null); setImagePreview(null); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAnalysis();
    if (e.key === "Escape") handleClear();
  };

  const handleShare = async () => {
    const url = result?.shareId ? `${window.location.origin}/report/${result.shareId}` : window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const DISCLAIMER = "Výsledky analýzy vygenerované umělou inteligencí mají informativní charakter. Technologie se může mýlit — poslední rozhodnutí je vždy na Vás.";

  const canUploadImage = profile?.tier === "basic" || profile?.tier === "pro";

  const riskColor = !result ? "" : result.risk >= 70 ? "text-red-400" : result.risk >= 40 ? "text-yellow-400" : "text-green-400";
  const riskBorderColor = !result ? "" : result.risk >= 70 ? "border-red-500/30" : result.risk >= 40 ? "border-yellow-500/30" : "border-green-500/30";
  const RiskIcon = !result ? Shield : result.risk >= 40 ? AlertTriangle : CheckCircle;

  const EXAMPLES = [
    {
      label: "📱 SMS z banky",
      text: "Vážený kliente, Vaše karta byla zablokována z důvodu podezřelé aktivity. Pro okamžité odblokování klikněte na odkaz: www.csob-overeni.cz/login. Máte 24 hodin.",
    },
    {
      label: "📦 Nedoručený balíček",
      text: "Ceska posta: Vas balik nelze dorucit kvuli chybejicimu poplatku 29 Kc. Zaplaťte zde pro doručení: https://ceska-posta-doruceni.com/platba",
    },
    {
      label: "🏆 Výhra v soutěži",
      text: "GRATULUJEME! Byl/a jste vybrán/a jako výherce iPhone 16 Pro v naší soutěži. Pro vyzvednutí výhry vyplňte údaje zde: www.vyhry-cz.com/iphone",
    },
    {
      label: "⚡ Urgentní email z úřadu",
      text: "Finanční úřad ČR: Evidujeme u Vás nedoplatek na dani z příjmu ve výši 4.250 Kč. Pokud nezaplatíte do 48 hodin, bude zahájeno exekuční řízení. Platba zde: www.financni-urad-platby.cz",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <main className="flex-grow text-white pt-28 px-4 sm:px-6 pb-20 flex flex-col items-center">
        <div className="max-w-4xl w-full space-y-10 text-center">

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest">
              <Zap size={10} fill="currentColor" /> AI Security v4.6
            </div>

            <h1 className="flex flex-col items-center justify-center font-black uppercase tracking-normal">
              <span className="text-5xl sm:text-6xl md:text-7xl text-white leading-normal">PROVĚŘ</span>
              <span className="text-2xl sm:text-4xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700 leading-normal">
                NEŽ KLIKNEŠ
              </span>
            </h1>

            <p className="text-slate-400 text-sm mt-3">
              <span>✓ 100% anonymní</span>
              <span className="mx-2 text-slate-600">·</span>
              <span>✓ Zdarma a bez registrace</span>
              <span className="mx-2 text-slate-600">·</span>
              <span>✓ Neukládáme váš obsah</span>
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Už jsme pomohli odhalit{" "}
              {totalAnalyses !== null ? (
                <span className="text-white font-black">{totalAnalyses.toLocaleString("cs-CZ")} podvodů</span>
              ) : (
                <span className="inline-block w-16 h-4 bg-slate-800 rounded animate-pulse align-middle" />
              )}
              . Bude ten váš další?
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              Zkuste to – vyberte ukázku podvodu:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setInput(ex.text); setResult(null); setError(null); }}
                  className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-slate-300 bg-slate-800/60 border border-white/10 hover:bg-slate-700/80 hover:text-white hover:border-white/20 active:scale-95 transition-all"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl mx-auto max-w-3xl flex flex-col">
            <p className="text-slate-200 text-sm font-semibold px-6 pt-5 pb-1 text-left">Zkopírujte podezřelou zprávu. Do 10 sekund víte, jestli je to podvod.</p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Vložte podezřelý text, SMS, email nebo URL..."
              className="w-full bg-transparent p-6 outline-none text-white text-base sm:text-lg min-h-[160px] resize-none placeholder:text-slate-600 rounded-t-[32px]"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />

            <div className="p-4 border-t border-white/5 bg-white/[0.02] rounded-b-[32px] space-y-3">
              {/* Main CTA */}
              <div className="flex items-center gap-2">
                {(input || image || result || error) && (
                  <button onClick={handleClear} className="shrink-0 flex items-center gap-1.5 px-4 py-4 rounded-2xl font-black text-xs text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 transition-all">
                    <X size={13} /> Vymazat
                  </button>
                )}
                <button
                  onClick={handleAnalysis}
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "PROVĚŘIT"}
                </button>
              </div>

              {/* Screenshot upload - secondary */}
              {imagePreview ? (
                <div className="flex items-center gap-3 px-1">
                  <img src={imagePreview} alt="Náhled" className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0" />
                  <p className="flex-1 text-xs text-slate-400 truncate">Screenshot připraven k analýze</p>
                  <button
                    type="button"
                    onClick={() => { setImage(null); setImagePreview(null); }}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : canUploadImage ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 text-slate-500 hover:text-purple-400 text-xs font-bold transition-colors py-1"
                >
                  <Camera size={13} /> Přidat screenshot
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { window.location.href = "/pricing"; }}
                  className="w-full flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-500 text-xs transition-colors py-1"
                >
                  <Lock size={13} /> Přidat screenshot <span className="text-purple-700 ml-1">(BASIC+)</span>
                </button>
              )}

              <p className="text-slate-700 text-[10px] text-center hidden sm:block">Ctrl+Enter · Esc pro smazání</p>
            </div>
          </div>

          <p className="text-slate-400 text-sm text-center max-w-3xl mx-auto leading-relaxed">
            ⚠️ {DISCLAIMER}
          </p>

          {error && <div className="max-w-3xl mx-auto w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-300 text-sm">{error}</div>}

          {result && (
            <div className={`rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden bg-slate-950/40 ${riskBorderColor} p-8 sm:p-10 text-left max-w-3xl mx-auto w-full`}>
              <div className="text-center mb-8">
                <div className={`text-7xl font-black mb-2 ${riskColor}`}>{result.risk}%</div>
                <div className={`inline-flex items-center gap-2 mb-3 ${riskColor}`}>
                  <RiskIcon size={20} />
                  <span className="font-black uppercase text-sm tracking-widest">{result.risk >= 70 ? "Vysoké riziko" : result.risk >= 40 ? "Střední riziko" : "Nízké riziko"}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-white">{result.verdict}</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Info size={14} /> Analýza</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p>
                </div>

                {result.threats && result.threats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> Identifikované hrozby</h4>
                    <ul className="space-y-1">
                      {result.threats.map((threat, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 text-sm"><span className="text-red-400 mt-0.5 shrink-0">•</span> {threat}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.tactics && result.tactics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Shield size={14} /> Taktiky útočníka</h4>
                    <ul className="space-y-1">
                      {result.tactics.map((tactic, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 text-sm"><span className="text-yellow-400 mt-0.5 shrink-0">▸</span> {tactic}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="italic text-slate-300 text-sm text-center">"{result.recommendation}"</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-slate-600 text-xs">
                    {result.remainingChecks !== undefined && (
                      <span>Zbývá dnes: <span className="text-slate-400 font-bold">{result.remainingChecks}/3</span></span>
                    )}
                  </div>
                  <button onClick={handleShare} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl">
                    {copied ? <><Check size={14} className="text-green-400" /> Zkopírováno!</> : <><Share2 size={14} /> Sdílet varování</>}
                  </button>
                </div>

                <p className="text-slate-400 text-sm text-center leading-relaxed pt-2 border-t border-white/5">
                  ⚠️ {DISCLAIMER}
                </p>
              </div>
            </div>
          )}

          {result?.shareId && (() => {
            const shareUrl = `${typeof window !== "undefined" ? window.location.origin : "https://neklikni.cz"}/report/${result.shareId}`;
            const waText = encodeURIComponent(`Pozor na tento podvod! Podívej se na analýzu: ${shareUrl}`);
            return (
              <div className="max-w-3xl mx-auto w-full bg-amber-900/20 border border-amber-700/30 rounded-[32px] p-8 space-y-5">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-black text-white">⚠️ Varujte svou rodinu a přátele</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">Sdílejte tento výsledek, aby se vaši blízcí nenechali nachytat.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <a
                    href={`https://wa.me/?text=${waText}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all active:scale-95"
                  >
                    💬 WhatsApp
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all active:scale-95"
                  >
                    📘 Facebook
                  </a>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(shareUrl);
                      setCtaCopied(true);
                      setTimeout(() => setCtaCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all active:scale-95"
                  >
                    {ctaCopied ? <><Check size={16} className="text-green-400" /> Odkaz zkopírován!</> : <><Copy size={16} /> Kopírovat odkaz</>}
                  </button>
                  <button
                    onClick={async () => { if (navigator.share) await navigator.share({ title: "NeKlikni.cz – Varování", text: "Pozor na tento podvod! Podívej se na analýzu:", url: shareUrl }); }}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition-all active:scale-95 sm:hidden"
                  >
                    <Share2 size={16} /> Sdílet
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}