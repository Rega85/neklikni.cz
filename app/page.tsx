"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Sparkles } from "lucide-react";
import { z } from "zod";

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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [result, setResult] = useState<z.infer<typeof AnalyzeResponseSchema> | null>(null);

  const analyzeScam = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });

      const rawData = await response.json();

      if (response.status === 401) {
        // ✅ Atraktivnější hláška pro nové uživatele
        setResult({ risk: "LIMIT", verdict: "Získej 3 analýzy zdarma! Stačí se jen přihlásit." });
        return;
      }
      if (response.status === 402) {
        // ✅ Jasná výzva k akci pro ty, co už službu znají
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

  const riskNum = result && !isNaN(Number(result.risk)) ? Number(result.risk) : 0;
  const isHigh = riskNum > 50;

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center px-6 pt-32 pb-20 relative">

      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-slate-900 border border-purple-500/50 shadow-2xl px-6 py-4 rounded-2xl flex items-start gap-4 max-w-md">
            <Sparkles className="text-purple-400 shrink-0 mt-1" size={24} />
            <div>
              <h4 className="font-bold text-white mb-1">Tuhle funkci právě trénujeme! 🚀</h4>
              <p className="text-sm text-slate-400">
                Rozpoznávání podvodů ze screenshotů brzy pro{" "}
                <span className="text-purple-400 font-bold">BASIC</span> a{" "}
                <span className="text-purple-400 font-bold">PRO</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl w-full space-y-10">

        <div className="text-center space-y-4">
          <h1 className="text-7xl font-black tracking-tighter italic text-white">
            Prověř <span className="text-purple-500 underline decoration-white/10">než klikneš</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-lg mx-auto leading-relaxed">
            AI bodyguard pro tvůj klidný internet.
          </p>
        </div>

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
              <span className="text-sm font-bold">Nahrát screenshot</span>
              <span className="ml-2 text-[9px] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest">PRO</span>
            </button>
            <button
              onClick={analyzeScam}
              disabled={loading}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-2xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 font-black text-white flex items-center justify-center gap-2 group active:scale-95"
            >
              {/* ✅ Konverzní tlačítko se slovem "ZDARMA" */}
              {loading ? (
                "Analyzuji..."
              ) : (
                <>
                  <ShieldAlert size={20} className="group-hover:scale-110 transition-transform" />
                  {!result ? "Prověřit zdarma" : "Prověřit znovu"}
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className={`rounded-3xl border overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-2xl
            ${result.risk === "LIMIT"
              ? 'border-amber-500/50 bg-amber-500/10'
              : isHigh
                ? 'border-red-500/30 bg-red-950/20'
                : 'border-green-500/30 bg-green-950/20'
            }`}>

            <div className="p-8 text-center border-b border-white/5">
              <div className={`text-7xl font-black mb-2
                ${result.risk === "LIMIT" ? 'text-amber-500' : isHigh ? 'text-red-400' : 'text-green-400'}`}>
                {result.risk === "LIMIT" ? "🔒 LIMIT" : `${result.risk}%`}
              </div>
              {result.risk !== "LIMIT" && (
                <div className={`text-xs font-black uppercase tracking-widest
                  ${isHigh ? 'text-red-500' : 'text-green-500'}`}>
                  {isHigh ? '⚠️ Vysoké riziko' : '✅ Nízké riziko'}
                </div>
              )}
            </div>

            <div className="p-8">
              {result.isLocked ? (
                <div className="space-y-4">
                  <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 overflow-hidden">
                    <div className="space-y-3 blur-sm opacity-20 select-none pointer-events-none" aria-hidden="true">
                      <div className="h-3 bg-white/40 rounded-full w-full" />
                      <div className="h-3 bg-white/40 rounded-full w-5/6" />
                      <div className="h-3 bg-white/40 rounded-full w-4/6" />
                      <div className="h-3 bg-white/40 rounded-full w-5/6" />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4">
                      <span className="text-2xl">🔒</span>
                      <p className="text-white font-bold text-sm">Podrobný rozbor je v BASIC / PRO</p>
                      <p className="text-slate-400 text-xs leading-tight">Získej víc detailů a konkrétní doporučení</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-white transition-all hover:scale-[1.01] shadow-lg shadow-purple-500/20"
                  >
                    Odemknout rozbor → 99 Kč/měs
                  </button>
                </div>

              ) : result.risk === "LIMIT" ? (
                <div className="text-center space-y-6">
                  <p className="text-amber-200 text-lg leading-relaxed italic font-medium">"{result.verdict}"</p>
                  <button
                    onClick={() => router.push('/register')}
                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 rounded-xl font-black text-slate-950 transition-all shadow-lg shadow-amber-500/20"
                  >
                    Vytvořit účet zdarma
                  </button>
                </div>

              ) : (
                <div className="space-y-6">
                  {/* Verdikt se zobrazením PRO analýzy */}
                  <p className="text-slate-200 text-lg leading-relaxed font-medium italic">
                    "{result.verdict}"
                  </p>

                  {result.analysis && (
                    <div className="space-y-8 pt-8 border-t border-white/5">
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3">
                          Hloubková analýza Sonnet 3.5
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {result.analysis}
                        </p>
                      </div>

                      {result.threats && result.threats.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-3">
                            Detekované hrozby
                          </h4>
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
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">
                            Doporučený postup
                          </h4>
                          <p className="text-sm text-purple-100/90 leading-relaxed font-medium">
                            {result.recommendation}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                            PRO analýza
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                          Elitní model Sonnet 3.5
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}