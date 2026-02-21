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
  const [authLoading, setAuthLoading] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => { if (mounted && authLoading) setAuthLoading(false); }, 3000);
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) { setAuthSession(session); setAuthLoading(false); clearTimeout(timer); }
    };
    load();
    fetch('/api/stats').then(r => r.json()).then(d => setTotalAnalyses(d.total || 0));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setAuthSession(s); setAuthLoading(false); });
    return () => { mounted = false; subscription.unsubscribe(); clearTimeout(timer); };
  }, [supabase]);

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
      if (res.status === 402) { router.push("/pricing"); return; }
      const data = await res.json();
      if (res.ok) { setResult(data); setTotalAnalyses(p => p + 1); } else setError(data.error);
    } catch (err) { setError("Chyba spojení."); } finally { setLoading(false); }
  };

  const getRiskColor = (r: number) => r > 60 ? "text-red-500 border-red-500/30 bg-red-500/5" : r > 25 ? "text-amber-500 border-amber-500/30 bg-amber-500/5" : "text-emerald-500 border-emerald-500/30 bg-emerald-500/5";

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-32 px-6 pb-20 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest"><Zap size={12} fill="currentColor" /> AI Security v2.0</div>
          <h1 className="text-6xl font-black italic uppercase tracking-tighter">Prověř <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700">než klikneš</span></h1>
        </div>
        <AnimatedCounter endValue={totalAnalyses} />
        <div className="relative group bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 shadow-2xl">
          <textarea id="analysis-input" name="analysis-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Vložte text nebo URL..." className="w-full bg-transparent p-6 outline-none text-white text-lg min-h-[160px]" />
          <div className="flex justify-between p-4 gap-4">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-400 font-bold px-6 py-3 bg-white/5 rounded-2xl transition-all hover:bg-white/10"><ImageIcon size={20} /><span>Sken</span></button>
            <button onClick={() => handleAnalysis({ text: input })} disabled={loading || authLoading} className="bg-white text-black px-12 py-4 rounded-2xl font-black flex items-center gap-2 transition-all active:scale-95">{loading ? <Loader2 className="animate-spin" /> : <ShieldAlert size={20} />} ANALÝZA</button>
          </div>
        </div>
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className={`rounded-[40px] border-2 backdrop-blur-3xl ${getRiskColor(result.risk)} shadow-2xl overflow-hidden`}>
              <div className="p-10 flex flex-col md:flex-row items-center gap-10 border-b border-white/5 relative">
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90"><circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="opacity-10" /><circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * result.risk) / 100} className="transition-all duration-1000 ease-out" /></svg>
                  <span className="absolute text-3xl font-black">{result.risk}%</span>
                </div>
                <div className="text-center md:text-left"><h2 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2">{result.verdict}</h2><div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><ShieldCheck size={12}/> Security Report</div></div>
              </div>
              <div className="p-10 bg-slate-950/40 space-y-8">
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-4"><h4 className="text-purple-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><Info size={14}/> Rozbor</h4><p className="text-slate-300 leading-relaxed text-sm">{result.analysis}</p></div>
                  <div className="space-y-4"><h4 className="text-red-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><ShieldAlert size={14}/> Hrozby</h4><div className="flex flex-wrap gap-2">{result.threats?.map((t: any, i: number) => <span key={i} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300"># {t}</span>)}</div></div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 text-center italic text-slate-400 text-sm">"{result.recommendation}"</div>
              </div>
            </div>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const r = new FileReader(); r.onloadend = () => handleAnalysis({ imageUrl: r.result as string }); r.readAsDataURL(file);
      }} />
    </main>
  );
}