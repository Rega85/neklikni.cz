"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Zap, Info, Shield, AlertTriangle, CheckCircle, Share2, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type AnalysisResult = {
  risk: number;
  verdict: string;
  analysis: string;
  threats: string[];
  tactics?: string[];
  recommendation: string;
  details?: {
    sender_analysis?: string;
    urgency_indicators?: string[];
    technical_indicators?: string[];
  };
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
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setTotalAnalyses(d.total ?? null))
      .catch(() => setTotalAnalyses(null));
  }, []);

  const handleAnalysis = useCallback(async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        await supabase.auth.signOut();
        throw new Error("Relace vypr&#353;ela. Zkus se znovu p&#345;ihl&#225;sit.");
      }

      const isAnonymous = !session?.user;
      const accessToken = session?.access_token ?? null;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ text: input, isAnonymous }),
      });

      const contentType = res.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Server neodpov&#283;d&#283;l spr&#225;vn&#283;. Zkuste to znovu.");
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.limitReached) {
          setError(data.message || "Denn&#237; limit vy&#269;erp&#225;n. Zaregistrujte se pro v&#237;ce anal&#253;z.");
        } else if (res.status === 402) {
          setError(data.message || "Nedostatek kredit&#367;. Kupte si bal&#237;&#269;ek.");
        } else {
          setError(data.error || "N&#283;co se pokazilo. Zkuste to znovu.");
        }
        return;
      }

      setResult(data);
      window.dispatchEvent(new CustomEvent("creditsUpdated"));
      setTotalAnalyses((prev) => (prev !== null ? prev + 1 : null));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Nepoda&#345;ilo se p&#345;ipojit k serveru.");
    } finally {
      setLoading(false);
    }
  }, [input, loading, supabase]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleAnalysis();
  };

  const handleShare = async () => {
    const url = result?.shareId
      ? `${window.location.origin}/result/${result.shareId}`
      : window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const riskColor = !result ? ""
    : result.risk >= 70 ? "text-red-400"
    : result.risk >= 40 ? "text-yellow-400"
    : "text-green-400";

  const riskBorderColor = !result ? ""
    : result.risk >= 70 ? "border-red-500/30"
    : result.risk >= 40 ? "border-yellow-500/30"
    : "border-green-500/30";

  const RiskIcon = !result ? Shield : result.risk >= 40 ? AlertTriangle : CheckCircle;

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      <main className="flex-grow text-white pt-28 px-4 sm:px-6 pb-20 flex flex-col items-center">
        <div className="max-w-4xl w-full space-y-10 text-center">

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest">
              <Zap size={10} fill="currentColor" /> AI Security v4.6
            </div>
            <h1 className="font-black italic uppercase leading-[0.9] tracking-tighter">
              <span className="block text-5xl sm:text-6xl md:text-7xl text-white">PROV&#282;&#344;</span>
              <span className="block text-5xl sm:text-6xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700">
                NE&#381; KLIKNE&#352;
              </span>
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              Komunitn&#237; &#353;t&#237;t:{" "}
              {totalAnalyses !== null ? (
                <span className="text-white text-lg font-black">{totalAnalyses.toLocaleString("cs-CZ")}</span>
              ) : (
                <span className="inline-block w-16 h-5 bg-slate-800 rounded animate-pulse align-middle" />
              )}{" "}
              hrozeb odhaleno
            </p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 shadow-2xl mx-auto max-w-3xl">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Vlo&#382;te podez&#345;el&#253; text, SMS, email nebo URL..."
              className="w-full bg-transparent p-6 outline-none text-white text-base sm:text-lg min-h-[160px] resize-none placeholder:text-slate-600"
            />
            <div className="flex items-center justify-between p-3 border-t border-white/5">
              <span className="text-slate-600 text-[10px] hidden sm:block">Ctrl+Enter pro odesl&#225;n&#237;</span>
              <button
                onClick={handleAnalysis}
                disabled={loading || !input.trim()}
                className="bg-white text-black px-12 py-3 rounded-2xl font-black text-xs flex items-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : "PROV&#282;&#344;IT"}
              </button>
            </div>
          </div>

          {error && (
            <div className="max-w-3xl mx-auto w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-5 text-red-300 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className={`rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden bg-slate-950/40 ${riskBorderColor} p-8 sm:p-10 text-left max-w-3xl mx-auto w-full`}>
              <div className="text-center mb-8">
                <div className={`text-7xl font-black mb-2 ${riskColor}`}>{result.risk}%</div>
                <div className={`inline-flex items-center gap-2 mb-3 ${riskColor}`}>
                  <RiskIcon size={20} />
                  <span className="font-black uppercase text-sm tracking-widest">
                    {result.risk >= 70 ? "Vysok&#233; riziko" : result.risk >= 40 ? "St&#345;edn&#237; riziko" : "N&#237;zk&#233; riziko"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter text-white">{result.verdict}</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                    <Info size={14} /> Anal&#253;za
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p>
                </div>

                {result.threats && result.threats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} /> Identifikovan&#233; hrozby
                    </h4>
                    <ul className="space-y-1">
                      {result.threats.map((threat, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                          <span className="text-red-400 mt-0.5 shrink-0">&#8226;</span> {threat}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.tactics && result.tactics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                      <Shield size={14} /> Taktiky &#250;to&#269;n&#237;ka
                    </h4>
                    <ul className="space-y-1">
                      {result.tactics.map((tactic, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                          <span className="text-yellow-400 mt-0.5 shrink-0">&#9658;</span> {tactic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <p className="italic text-slate-300 text-sm text-center">&#8220;{result.recommendation}&#8221;</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-slate-600 text-xs">
                    {result.tier && result.tier !== "free" && result.credits !== undefined && (
                      <span>Zb&#253;v&#225; kredit&#367;: <span className="text-slate-400 font-bold">{result.credits}</span></span>
                    )}
                    {result.remainingChecks !== undefined && (
                      <span>Zb&#253;v&#225; dnes: <span className="text-slate-400 font-bold">{result.remainingChecks}/3</span></span>
                    )}
                  </div>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl"
                  >
                    {copied
                      ? <><Check size={14} className="text-green-400" /> Zkop&#237;rov&#225;no!</>
                      : <><Share2 size={14} /> Sd&#237;let varov&#225;n&#237;</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full border-t border-white/5 py-8 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-purple-500" />
            <span className="font-black text-white uppercase tracking-tighter">NeKlikni.cz</span>
            <span>&#8212; PK Virgine, s.r.o.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/privacy" className="hover:text-white transition-colors">Ochrana osobn&#237;ch &#250;daj&#367;</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Obchodn&#237; podm&#237;nky</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Kontakt</Link>
          </div>
          <div className="text-center sm:text-right">
            <p>V&#253;sledky AI maj&#237; informativn&#237; charakter.</p>
            <p>Posledn&#237; rozhodnut&#237; je v&#382;dy na V&#225;s.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}