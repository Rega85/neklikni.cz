"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { 
    risk: number | string, 
    verdict: string,
    isLocked?: boolean
  }>(null);

  const analyzeScam = async () => {
    if (!input) return;
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        setResult({ risk: "LIMIT", verdict: data.error || "Vyčerpali jste kredity." });
        return;
      }
      setResult(data);
    } catch (error) {
      setResult({ risk: 0, verdict: "Chyba spojení." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center px-6 pt-12 relative">
      <div className="max-w-3xl w-full space-y-12">

        <div className="text-center space-y-6">
          <h1 className="text-7xl font-black tracking-tighter italic">
            Prověř <span className="text-purple-500 underline decoration-white/10">než klikneš</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-lg mx-auto leading-relaxed">
            AI bodyguard pro tvůj klidný internet. Prověříme zprávy dřív, než na ně klikneš.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 shadow-2xl focus-within:border-purple-500/50 transition-all flex items-center">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Vlož podezřelou zprávu, SMS nebo odkaz..."
            className="w-full bg-transparent p-6 outline-none text-lg resize-none min-h-[150px]"
          />
          <button 
            onClick={analyzeScam}
            disabled={loading}
            className="mr-4 bg-purple-600 hover:bg-purple-500 p-6 rounded-2xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
          >
            {loading ? "..." : <ShieldAlert size={32} />}
          </button>
        </div>

        {result && (
          <div className={`p-8 rounded-3xl border-2 transition-all text-center animate-in fade-in slide-in-from-top-4
            ${result.risk === "LIMIT" ? 'border-amber-500/50 bg-amber-500/10' : 
              Number(result.risk) > 50 ? 'border-red-500/50 bg-red-950/20' : 'border-green-500/50 bg-green-950/20'}`}>
            
            <div className={`text-6xl font-black mb-4 
              ${result.risk === "LIMIT" ? 'text-amber-500' : 
                Number(result.risk) > 50 ? 'text-red-500' : 'text-green-500'}`}>
              {result.risk === "LIMIT" ? "🔒 LIMIT" : `${result.risk}% RIZIKO`}
            </div>

            {/* Paywall pro free uživatele */}
            {result.isLocked ? (
              <div className="mt-6 space-y-4">
                <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 overflow-hidden">
                  <div className="space-y-3 blur-md opacity-30 select-none pointer-events-none">
                    <div className="h-4 bg-white/30 rounded w-full" />
                    <div className="h-4 bg-white/30 rounded w-5/6" />
                    <div className="h-4 bg-white/30 rounded w-4/6" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="px-5 py-2 rounded-full bg-slate-950 border border-purple-500/50 text-white font-bold text-sm shadow-2xl">
                      🔒 Podrobný rozbor je v BASIC / PRO
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/pricing')}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl font-black text-white shadow-lg transition-transform hover:scale-[1.01]"
                >
                  ODEMKNOUT ANALÝZU (99 Kč/měs)
                </button>
              </div>
            ) : result.risk === "LIMIT" ? (
              <div className="mt-6">
                <p className="text-xl font-medium text-amber-200 leading-relaxed px-4">
                  Denní limit vyčerpán. Přihlas se nebo upgraduj pro neomezený přístup.
                </p>
                <button 
                  onClick={() => router.push('/pricing')} 
                  className="mt-8 w-full py-4 bg-amber-500 hover:bg-amber-400 rounded-xl font-black text-slate-950 shadow-lg transition-all"
                >
                  DOPLNIT KREDITY
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-xl font-medium italic text-slate-200 leading-relaxed px-4">
                  "{result.verdict}"
                </p>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}