"use client";

import { useState, useEffect, useRef } from "react";
import { ShieldAlert, Image as ImageIcon, Loader2, Zap, Info } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const [supabase] = useState(() => createClient());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setTotalAnalyses(d.total || 2468)).catch(() => setTotalAnalyses(2468));
  }, []);

  const handleAnalysis = async () => {
    if (!input.trim()) return;
    setLoading(true); setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (res.ok) { setResult(data); setTotalAnalyses(p => p + 1); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-28 px-6 pb-20 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-10 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest"><Zap size={10} fill="currentColor" /> AI Security v4.6</div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">PROVĚŘ <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700">NEŽ KLIKNEŠ</span></h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Komunitní štít: <span className="text-white text-lg">{totalAnalyses.toLocaleString()}</span> hrozeb</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 shadow-2xl mx-auto max-w-3xl">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Vložte text nebo URL..." className="w-full bg-transparent p-6 outline-none text-white text-lg min-h-[160px] resize-none" />
          <div className="flex justify-end p-3 border-t border-white/5">
            <button onClick={handleAnalysis} disabled={loading} className="bg-white text-black px-12 py-3 rounded-2xl font-black text-xs flex items-center gap-2 active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" size={18} /> : "PROVĚŘIT"}
            </button>
          </div>
        </div>

        {result && (
          <div className="rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden bg-slate-950/40 border-white/5 p-10 text-left">
            <div className="text-center mb-8">
              <div className="text-6xl font-black text-purple-500 mb-2">{result.risk}%</div>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">{result.verdict}</h2>
            </div>
            <div className="space-y-6">
              <div className="space-y-2"><h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Info size={14}/> Analýza</h4><p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p></div>
              <div className="p-4 rounded-2xl bg-white/5 text-center italic text-slate-400 text-xs">"{result.recommendation}"</div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}