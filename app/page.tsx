"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, Zap, Info, Shield, AlertTriangle, CheckCircle, Share2, Check, X } from "lucide-react";
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

  useEffect(() => {
    try {
      const cached = localStorage.getItem("neklikni_total");
      if (cached) setTotalAnalyses(parseInt(cached, 10));
    } catch {}

    fetch(`/api/stats?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const total = d.total ?? null;
        if (total !== null) {
          setTotalAnalyses(total);
          try { localStorage.setItem("neklikni_total", String(total)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleAnalysis = useCallback(async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
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
  }, [input, loading]);

  const handleClear = () => { setInput(""); setResult(null); setError(null); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAnalysis();
    if (e.key === "Escape") handleClear();
  };

  const handleShare = async () => {
    const url = result?.shareId ? `${window.location.origin}/result/${result.shareId}` : window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const riskColor = !result ? "" : result.risk >= 70 ? "text-red-400" : result.risk >= 40 ? "text-yellow-400" : "text-green-400";
  const riskBorderColor = !result ? "" : result.risk >= 70 ? "border-red-500/30" : result.risk >= 40 ? "border-yellow-500/30" : "border-green-500/30";
  const RiskIcon = !result ? Shield : result.risk >= 40 ? AlertTriangle : CheckCircle;

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <main className="flex-grow text-white pt-28 px-4 sm:px-6 pb-20 flex flex-col items-center">
        <div className="max-w-4xl w-full space-y-10 text-center">

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest">
              <Zap size={10} fill="currentColor" /> AI Security v4.6
            </div>

            <h1 className="flex flex-col items-center justify-center font-black italic uppercase tracking-normal">
              <span className="text-5xl sm:text-6xl md:text-7xl text-white leading-tight">PROVĚŘ</span>
              <span className="text-3xl sm:text-5xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700 leading-tight">
                NEŽ KLIKNEŠ
              </span>
            </h1>

            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
              Komunitní štít:{" "}
              {totalAnalyses !== null ? (
                <span className="text-white text-lg font-black">{totalAnalyses.toLocaleString("cs-CZ")}</span>
              ) : (
                <span className="inline-block w-16 h-5 bg-slate-800 rounded animate-pulse align-middle" />
              )}{" "}
              hrozeb odhaleno
            </p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl mx-auto max-w-3xl flex flex-col">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Vložte podezřelý text, SMS, email nebo URL..."
              className="w-full bg-transparent p-6 outline-none text-white text-base sm:text-lg min-h-[160px] resize-none placeholder:text-slate-600 rounded-t-[32px]"
            />
            <div className="flex items-center justify-between p-4 border-t border-white/5 bg-white/[0.02] rounded-b-[32px]">
              <span className="text-slate-600 text-[10px] hidden sm:block">Ctrl+Enter · Esc pro smazání</span>
              <div className="flex items-center gap-2 ml-auto">
                {(input || result || error) && (
                  <button onClick={handleClear} className="flex items-center gap-1.5 px-4 py-3 rounded-2xl font-black text-xs text-slate-500 hover:text-white bg-white/5 hover:bg-white/10 transition-all">
                    <X size={13} /> Vymazat
                  </button>
                )}
                <button
                  onClick={handleAnalysis}
                  disabled={loading || !input.trim()}
                  className="bg-white text-black px-12 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : "PROVĚŘIT"}
                </button>
              </div>
            </div>
          </div>

          {error && <div className="max-w-3xl mx-auto w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-300 text-sm">{error}</div>}

          {result && (
            <div className={`rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden bg-slate-950/40 ${riskBorderColor} p-8 sm:p-10 text-left max-w-3xl mx-auto w-full`}>
              <div className="text-center mb-8">
                <div className={`text-7xl font-black mb-2 ${riskColor}`}>{result.risk}%</div>
                <div className={`inline-flex items-center gap-2 mb-3 ${riskColor}`}>
                  <RiskIcon size={20} />
                  <span className="font-black uppercase text-sm tracking-widest">{result.risk >= 70 ? "Vysoké riziko" : result.risk >= 40 ? "Střední riziko" : "Nízké riziko"}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-white">{result.verdict}</h2>
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
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full bg-[#020617] mt-auto border-t border-white/5 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start justify-between gap-8 text-xs text-slate-500">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-purple-500" />
              <span className="font-black text-white uppercase tracking-tighter text-sm">Neklikni.cz</span>
            </div>
            <p>© {new Date().getFullYear()} Všechna práva vyhrazena.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-8 md:gap-16">
            <div className="space-y-1 leading-relaxed">
              <p className="text-slate-300 font-bold mb-2 uppercase text-[10px] tracking-widest">Provozovatel</p>
              <p>PK Virgine, s.r.o.</p>
              <p>IČO: 21448507, DIČ: CZ21448507</p>
              <p>Korunní 2569/108, Vinohrady, 101 00 Praha</p>
              <p>Datová schránka: bty8mey</p>
              <p>Spisová značka: C 401405/MSPH Městský soud v Praze</p>
            </div>
            <div className="space-y-2 flex flex-col">
              <p className="text-slate-300 font-bold mb-1 uppercase text-[10px] tracking-widest">Informace</p>
              <Link href="/privacy" prefetch={false} className="hover:text-white transition-colors">Ochrana osobních údajů</Link>
              <Link href="/terms" prefetch={false} className="hover:text-white transition-colors">Obchodní podmínky</Link>
              <Link href="/contact" prefetch={false} className="hover:text-white transition-colors">Kontakt</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-6 pt-4 border-t border-white/5 text-[10px] text-slate-600 text-center leading-relaxed">
          Výsledky analýzy vygenerované umělou inteligencí mají informativní charakter. Technologie se může mýlit — poslední rozhodnutí je vždy na Vás. Provozovatel nenese právní odpovědnost za případné škody způsobené kybernetickým útokem.
        </div>
      </footer>
    </div>
  );
}
