"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Loader2, AlertCircle, Zap, ShieldCheck, Info } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AnimatedCounter } from "./components/AnimatedCounter";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [supabase] = useState(() => createClient());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => setTotalAnalyses(d.total || 0));
  }, []);

  const handleAnalysis = async (payload: { text?: string, imageUrl?: string }) => {
    if (!payload.text?.trim() && !payload.imageUrl) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) { setResult(data); setTotalAnalyses(p => p + 1); } 
      else setError(data.error);
    } catch (err) { setError("Spojení se serverem selhalo."); } 
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-28 px-6 pb-20 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest"><Zap size={10} fill="currentColor" /> AI Security v4.6</div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none break-words">PROVĚŘ <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700">NEŽ KLIKNEŠ</span></h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Komunitní štít: <span className="text-white">{totalAnalyses.toLocaleString()}</span> hrozeb</p>
        </div>

        <div className="relative group bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 shadow-2xl">
          <textarea id="analysis-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Vložte text nebo URL..." className="w-full bg-transparent p-6 outline-none text-white text-base min-h-[160px] resize-none" />
          <div className="flex justify-between p-3 gap-3 border-t border-white/5">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-400 font-bold px-5 py-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-xs"><ImageIcon size={18} /><span>Sken</span></button>
            <button onClick={() => handleAnalysis({ text: input })} disabled={loading} className="bg-white text-black px-10 py-3 rounded-2xl font-black text-xs flex items-center gap-2 active:scale-95 transition-all">{loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldAlert size={18} />} ANALÝZA</button>
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold"><AlertCircle size={18} />{error}</div>}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className={`rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden ${result.risk > 60 ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'}`}>
              <div className="p-10 flex flex-col items-center text-center gap-4">
                <div className="text-7xl font-black">{result.risk}%</div>
                <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">{result.verdict}</h2>
              </div>
              <div className="p-10 bg-slate-950/40 border-t border-white/5 space-y-6">
                <div className="space-y-2"><h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Info size={14}/> Rozbor AI</h4><p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p></div>
                <div className="p-4 rounded-2xl bg-white/5 text-center italic text-slate-300 text-xs border border-white/5">"{result.recommendation}"</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => handleAnalysis({ imageUrl: reader.result as string });
        reader.readAsDataURL(file);
      }} />
    </main>
  );
}