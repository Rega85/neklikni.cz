"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Loader2, AlertCircle, Zap, ShieldCheck, Info } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [supabase] = useState(() => createClient());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (res.ok) setResult(data); else setError(data.error);
    } catch (err) { setError("Analýza selhala."); } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-28 px-6 pb-20 flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-widest"><Zap size={10} fill="currentColor" /> AI Security v4.6</div>
          <h1 className="text-5xl sm:text-7xl font-black italic uppercase tracking-tighter leading-tight text-center">PROVĚŘ <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700">NEŽ KLIKNEŠ</span></h1>
        </div>

        <div className="relative group bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] p-2 shadow-2xl">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Vložte text nebo URL..." className="w-full bg-transparent p-6 outline-none text-white text-lg min-h-[160px] resize-none" />
          <div className="flex justify-between p-3 gap-3 border-t border-white/5">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-slate-400 font-bold px-5 py-3 bg-white/5 rounded-2xl hover:bg-white/10 text-xs transition-all"><ImageIcon size={18} /><span>Vizuální sken</span></button>
            <button onClick={() => handleAnalysis({ text: input })} disabled={loading} className="bg-white text-black px-10 py-3 rounded-2xl font-black text-xs active:scale-95 transition-all">{loading ? <Loader2 className="animate-spin" size={18} /> : "PROVĚŘIT"}</button>
          </div>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-xs font-bold text-center">{error}</div>}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 w-full">
            <div className={`rounded-[40px] border-2 backdrop-blur-3xl shadow-2xl overflow-hidden bg-slate-950/40 ${result.risk > 50 ? 'border-red-500/30' : 'border-emerald-500/30'}`}>
              <div className="p-12 text-center border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                <div className={`text-8xl font-black mb-4 ${result.risk > 50 ? 'text-red-500' : 'text-emerald-500'}`}>{result.risk}%</div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{result.verdict}</h2>
              </div>
              <div className="p-12 space-y-10">
                <div className="space-y-4 text-left">
                  <h4 className="text-purple-400 font-black uppercase text-xs tracking-widest flex items-center gap-2"><Info size={16}/> Hloubková analýza hrozby</h4>
                  <p className="text-slate-200 text-lg leading-relaxed font-light whitespace-pre-line">{result.analysis}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                  <div className="space-y-4">
                    <h4 className="text-red-400 font-black uppercase text-xs tracking-widest flex items-center gap-2"><ShieldAlert size={16}/> Rizikové faktory</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.threats?.map((t: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300"># {t}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/10">
                    <h4 className="text-white font-black uppercase text-[10px] tracking-widest mb-3 leading-none">Doporučení experta</h4>
                    <p className="text-slate-300 italic text-sm leading-relaxed">"{result.recommendation}"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader(); reader.onloadend = () => handleAnalysis({ imageUrl: reader.result as string }); reader.readAsDataURL(file);
      }} />
    </main>
  );
}