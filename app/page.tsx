"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Sparkles } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/utils/supabase/client";
import { AnimatedCounter } from "./components/AnimatedCounter";

const AnalyzeResponseSchema = z.object({
  risk: z.union([z.number(), z.literal("LIMIT")]),
  verdict: z.string(),
  isLocked: z.boolean().optional(),
  analysis: z.string().optional(),
  threats: z.array(z.string()).optional(),
  recommendation: z.string().optional(),
});

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [result, setResult] = useState<z.infer<typeof AnalyzeResponseSchema> | null>(null);
  
  // ✅ State pro sdílení
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  
  // ✅ State pro počítadlo analýz
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => setTotalAnalyses(d.total))
      .catch(err => console.error("Nelze načíst statistiky", err));
  }, []);

  const analyzeScam = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    setShareUrl(null); // Reset URL při nové analýze

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });

      const rawData = await response.json();

      if (response.status === 401) {
        setResult({ risk: "LIMIT", verdict: "Získej 3 analýzy zdarma! Stačí se jen přihlásit." });
        return;
      }
      if (response.status === 402) {
        setResult({ risk: "LIMIT", verdict: "Dosáhl jsi svého limitu. Odemkni neomezenou ochranu!" });
        return;
      }
      if (!response.ok) {
        setResult({ risk: 0, verdict: "Něco se pokazilo. Zkus to znovu." });
        return;
      }

      const parsed = AnalyzeResponseSchema.safeParse(rawData);
      if (!parsed.success) {
        setResult({ risk: 0, verdict: "Systém vrátil neplatná data." });
        return;
      }
      setResult(parsed.data);
    } catch {
      setResult({ risk: 0, verdict: "Chyba spojení. Zkontrolujte internet." });
    } finally {
      setLoading(false);
    }
  };

  const handleFakeDoor = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleShare = async () => {
    if (!result) return;
    setSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (data.url) {
        setShareUrl(data.url);
        await navigator.clipboard.writeText(data.url);
      }
    } catch (err) {
      console.error("Chyba při sdílení:", err);
    } finally {
      setSharing(false);
    }
  };

  const riskNum = result && !isNaN(Number(result.risk)) ? Number(result.risk) : 0;
  const isHigh = riskNum > 50;

  return (
    <main className="min-h-[85vh] flex flex-col items-center px-6 pt-24 pb-12 relative">

      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-slate-900 border border-purple-500/50 shadow-2xl px-6 py-4 rounded-2xl flex items-start gap-4 max-w-md text-left text-white">
            <Sparkles className="text-purple-400 shrink-0 mt-1" size={24} />
            <div>
              <h4 className="font-bold mb-1">Tuhle funkci právě trénujeme! 🚀</h4>
              <p className="text-sm text-slate-400">Rozpoznávání podvodů ze screenshotů brzy.</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl w-full space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter italic text-white">
            Prověř <span className="text-purple-500 underline decoration-white/10">než klikneš</span>
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed">
            AI bodyguard pro tvůj klidný internet.
          </p>
        </div>

        <AnimatedCounter endValue={totalAnalyses} />

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 shadow-2xl focus-within:border-purple-500/50 transition-all flex flex-col">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Vlož podezřelou zprávu, SMS nebo odkaz..."
            className="w-full bg-transparent p-6 outline-none text-white text-lg resize-none min-h-[150px]"
          />
          <div className="flex flex-col sm:flex-row justify-between items-center px-4 pb-4 gap-4">
            <button
              onClick={handleFakeDoor}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-400 hover:text-purple-400 transition-colors px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-purple-500/50 group"
            >
              <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Screenshot</span>
              <span className="text-[9px] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest">PRO</span>
            </button>
            
            <button
              onClick={analyzeScam}
              disabled={loading}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-2xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 font-black text-white flex items-center justify-center gap-2 group active:scale-95"
            >
              {loading ? "Analyzuji..." : (
                <>
                  <ShieldAlert size={20} className="group-hover:scale-110 transition-transform" />
                  {result ? "Prověřit znovu" : user ? "Prověřit zprávu" : "Prověřit zdarma"}
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className={`rounded-3xl border overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-2xl
            ${result.risk === "LIMIT" ? 'border-amber-500/50 bg-amber-500/10' : isHigh ? 'border-red-500/30 bg-red-950/20' : 'border-green-500/30 bg-green-950/20'}`}>
            
            <div className="p-8 text-center border-b border-white/5">
              <div className={`text-7xl font-black mb-2 ${result.risk === "LIMIT" ? 'text-amber-500' : isHigh ? 'text-red-400' : 'text-green-400'}`}>
                {result.risk === "LIMIT" ? "🔒 LIMIT" : `${result.risk}%`}
              </div>
              {result.risk !== "LIMIT" && (
                <div className={`text-xs font-black uppercase tracking-widest ${isHigh ? 'text-red-500' : 'text-green-500'}`}>
                  {isHigh ? '⚠️ Vysoké riziko' : '✅ Nízké riziko'}
                </div>
              )}
            </div>

            <div className="p-8">
              {result.risk === "LIMIT" ? (
                <div className="text-center space-y-6">
                  <p className="text-amber-200 text-lg leading-relaxed font-medium italic">"{result.verdict}"</p>
                  <button onClick={() => router.push('/register')} className="w-full py-4 bg-amber-500 hover:bg-amber-400 rounded-xl font-black text-slate-950 transition-all shadow-lg">Vytvořit účet zdarma</button>
                </div>
              ) : (
                <div className="space-y-6 text-left">
                  <p className="text-slate-200 text-lg leading-relaxed font-medium italic text-center">"{result.verdict}"</p>
                  
                  {result.analysis && (
                    <div className="space-y-8 pt-8 border-t border-white/5">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Hloubková analýza</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p>
                      </div>

                      {result.threats && result.threats.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400">Detekované hrozby</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {result.threats.map((threat, i) => (
                              <div key={i} className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-slate-300">
                                <span className="text-purple-500">⚠️</span> {threat}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.recommendation && (
                        <div className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Doporučený postup</h4>
                          <p className="text-sm text-purple-100/90 leading-relaxed font-medium">{result.recommendation}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md">PRO analýza</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Nejpokročilejší AI model</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ✅ BLOK PRO SDÍLENÍ S FACEBOOKEM A X */}
            {result.risk !== "LIMIT" && (
              <div className="p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50">
                <div className="text-sm text-slate-400 font-medium">
                  Ukaž tohle ostatním a chraň je.
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  
                  {shareUrl ? (
                    <>
                      <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-400 font-bold animate-in fade-in">
                        ✅ Zkopírováno!
                      </div>
                      
                      {/* Tlačítko Facebook */}
                      <a 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-4 py-3 bg-[#1877F2] hover:bg-[#1865f2] rounded-xl transition-all shadow-lg shadow-blue-500/20 animate-in fade-in zoom-in duration-300"
                        title="Sdílet na Facebooku"
                      >
                        <span className="text-white font-bold text-sm">f</span>
                      </a>
                      
                      {/* Tlačítko 𝕏 (Twitter) */}
                      <a 
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Právě jsem prověřil podezřelou zprávu přes NeKlikni.cz. Tady je výsledek AI analýzy: ")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-4 py-3 bg-black hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-all shadow-lg animate-in fade-in zoom-in duration-300 delay-75"
                        title="Sdílet na X"
                      >
                        <span className="text-white font-bold text-sm">𝕏</span>
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={handleShare}
                      disabled={sharing}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                      {sharing ? "Generuji odkaz..." : "🔗 Získat odkaz pro sdílení"}
                    </button>
                  )}
                  
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}