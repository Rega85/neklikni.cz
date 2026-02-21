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
  const [authSession, setAuthSession] = useState<any>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthSession(session);
    };
    load();
    fetch('/api/stats').then(r => r.json()).then(d => setTotalAnalyses(d.total || 0));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthSession(s));
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleAnalysis = async (payload: { text?: string, imageUrl?: string }) => {
    if (!payload.text?.trim() && !payload.imageUrl) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) { 
        setResult(data); 
        setTotalAnalyses(p => p + 1); 
      } else {
        setError(data.error || "Při analýze došlo k chybě.");
      }
    } catch (err) { 
      setError("Chyba spojení se serverem."); 
    } finally { 
      setLoading(false); 
    }
  };

  const getRiskColor = (r: number) => r > 60 ? "text-red-500 border-red-500/30 bg-red-500/5" : r > 25 ? "text-amber-500 border-amber-500/30 bg-amber-500/5" : "text-emerald-500 border-emerald-500/30 bg-emerald-500/5";

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-24 px-6 pb-20 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest">
            <Zap size={10} fill="currentColor" /> AI Security Engine V4.6
          </div>
          <h1 className="text-4xl sm:text-7xl font-black italic uppercase tracking-tighter leading-[0.9]">
            PROVĚŘ <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700">NEŽ KLIKNEŠ</span>
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Komunitní štít: <span className="text-white">{totalAnalyses.toLocaleString()}</span> hrozeb</p>
        </div>

        <div className="relative group bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[28px] p-1 shadow-2xl overflow-hidden">
          <textarea 
            id="analysis-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Vložte podezřelý text nebo URL adresu..."
            className="w-full bg-transparent p-6 outline-none text-white text-base min-h-[140px] resize-none"
          />
          <div className="flex justify-between p-3 gap-3 border-t border-white/5">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-400 font-bold px-4 py-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-xs">
              <ImageIcon size={16} /> <span>Sken</span>
            </button>
            <button 
              onClick={() => handleAnalysis({ text: input })} 
              disabled={loading}
              className="bg-white text-black px-8 py-2 rounded-xl font-black text-xs flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldAlert size={16} />} ANALÝZA
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="text-red-500" size={18} />
            <p className="text-red-400 text-xs font-bold">{error}</p>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className={`rounded-[32px] border-2 backdrop-blur-3xl ${getRiskColor(result.risk)} shadow-2xl overflow-hidden`}>
              <div className="p-8 flex flex-col items-center text-center gap-6">
                <div className="relative flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-10" />
                    <circle cx="48" cy="48" r="44" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={276} strokeDashoffset={276 - (276 * result.risk) / 100} className="transition-all duration-1000 ease-out" />
                  </svg>
                  <span className="absolute text-2xl font-black">{result.risk}%</span>
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">{result.verdict}</h2>
                  <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mx-auto">
                    <ShieldCheck size={12} className="text-purple-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">AI Security Report Verified</span>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-slate-950/40 border-t border-white/5 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Info size={14}/> Rozbor AI</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-red-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><ShieldAlert size={14}/> Detekované hrozby</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.threats?.map((t: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400"># {t}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 text-center italic text-slate-300 text-xs border border-white/5 font-medium leading-relaxed">
                  "{result.recommendation}"
                </div>
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