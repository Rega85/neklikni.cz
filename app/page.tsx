"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Sparkles } from "lucide-react"; 
import { z } from "zod";

const AnalyzeResponseSchema = z.object({
  risk: z.union([z.number(), z.literal("LIMIT")]),
  verdict: z.string(),
  isLocked: z.boolean().optional(),
});

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [result, setResult] = useState<null | { 
    risk: number | string, 
    verdict: string,
    isLocked?: boolean
  }>(null);

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
      if (!response.ok) {
        setResult({ risk: "LIMIT", verdict: rawData.error || "Vyčerpali jste kredity." });
        return;
      }

      const parsedData = AnalyzeResponseSchema.safeParse(rawData);
      if (!parsedData.success) {
        setResult({ risk: 0, verdict: "Systém vrátil neplatná data." });
        return;
      }
      setResult(parsedData.data);
    } catch (error) {
      setResult({ risk: 0, verdict: "Chyba spojení. Zkontrolujte internet." });
    } finally {
      setLoading(false);
    }
  };

  const handleFakeDoor = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center px-6 pt-32 pb-20 relative">
      
      {/* Toast - Fake Door */}
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="bg-slate-900 border border-purple-500/50 shadow-2xl shadow-purple-500/20 px-6 py-4 rounded-2xl flex items-start gap-4 max-w-md">
            <Sparkles className="text-purple-400 shrink-0 mt-1" size={24} />
            <div>
              <h4 className="font-bold text-white mb-1">Tuhle funkci právě trénujeme! 🚀</h4>
              <p className="text-sm text-slate-400">
                Rozpoznávání podvodů ze screenshotů ladíme. Brzy pro tarify <span className="text-purple-400 font-bold">BASIC</span> a <span className="text-purple-400 font-bold">PRO</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hlavní vycentrovaný obsah */}
      <div className="max-w-3xl w-full space-y-12">
        <div className="text-center space-y-6">
          <h1 className="text-7xl font-black tracking-tighter italic text-white">
            Prověř <span className="text-purple-500 underline decoration-white/10">než klikneš</span>
          </h1>
          <p className="text-slate-400 text-xl max-w-lg mx-auto leading-relaxed">
            AI bodyguard pro tvůj klidný internet. Prověříme zprávy dřív, než na ně klikneš.
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
              <span className="ml-2 text-[9px] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest shadow-lg">PRO</span>
            </button>

            <button 
              onClick={analyzeScam}
              disabled={loading}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-2xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 font-black text-white flex items-center justify-center gap-2"
            >
              {loading ? "Analyzuji..." : <><ShieldAlert size={20} /> Prověřit</>}
            </button>
          </div>
        </div>

        {result && (
          <div className={`p-8 rounded-3xl border-2 transition-all text-center animate-in fade-in slide-in-from-top-4
            ${result.risk === "LIMIT" ? 'border-amber-500/50 bg-amber-500/10' : 
              (!isNaN(Number(result.risk)) && Number(result.risk) > 50) ? 'border-red-500/50 bg-red-950/20' : 'border-green-500/50 bg-green-950/20'}`}>
            
            <div className={`text-6xl font-black mb-4 
              ${result.risk === "LIMIT" ? 'text-amber-500' : 
                (!isNaN(Number(result.risk)) && Number(result.risk) > 50) ? 'text-red-500' : 'text-green-500'}`}>
              {result.risk === "LIMIT" ? "🔒 LIMIT" : `${result.risk}% RIZIKO`}
            </div>

            <div className="mt-6">
              <p className="text-xl font-medium italic text-slate-200 leading-relaxed px-4">
                "{result.verdict}"
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}