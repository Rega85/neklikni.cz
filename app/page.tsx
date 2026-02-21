"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Loader2, Share2, AlertCircle, Zap, ShieldCheck, Info } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AnimatedCounter } from "./components/AnimatedCounter";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadInitialData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) {
          setUser(user);
          setAuthLoading(false);
        }
      } catch (err) {
        console.error("Auth error:", err);
        if (mounted) setAuthLoading(false);
      }
    };

    loadInitialData();
    
    // Načti stats
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { if (mounted) setTotalAnalyses(d.total || 0); })
      .catch(console.error);

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleAnalysis = async (payload: { text?: string, imageUrl?: string }) => {
    // Kontrola přihlášení
    if (!user) { 
      router.push("/login"); 
      return; 
    }
    
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (res.status === 401) {
        // Session expired
        router.push("/login");
        return;
      }
      
      if (res.status === 402) {
        // No credits
        setError("Nemáš dostatek kreditů. Přikup si je v ceníku.");
        router.push("/pricing");
        return;
      }
      
      if (res.ok) {
        setResult(data);
        setTotalAnalyses(prev => prev + 1);
      } else {
        setError(data.error || "Něco se pokazilo. Zkus to znovu.");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Chyba připojení. Zkontroluj internet a zkus to znovu.");
    } finally { 
      setLoading(false); 
    }
  };

  // Dynamické barvy podle rizika
  const getRiskColor = (risk: number) => {
    if (risk > 70) return "text-red-500 border-red-500/30 bg-red-500/5 shadow-red-500/20";
    if (risk > 30) return "text-amber-500 border-amber-500/30 bg-amber-500/5 shadow-amber-500/20";
    return "text-emerald-500 border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/20";
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-40 px-6 pb-20 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-16">
        
        {/* HERO SECTION */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            <Zap size={12} fill="currentColor" /> AI Security Engine v4.6
          </div>
          <h1 className="text-6xl sm:text-8xl font-black italic uppercase tracking-tighter leading-none">
            Prověř <span className="text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700">než klikneš</span>
          </h1>
          <p className="text-slate-500 text-lg max-w-lg mx-auto font-medium">
            Elitní detekce phishingových hrozeb v reálném čase.
          </p>
        </div>

        <AnimatedCounter endValue={totalAnalyses} />

        {/* INPUT BOX - DARK GLASS LOOK */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-[32px] blur opacity-10 group-focus-within:opacity-25 transition duration-1000"></div>
          <div className="relative bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl p-3 shadow-2xl transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Vložte podezřelý text, SMS nebo URL adresu..."
              className="w-full bg-transparent p-6 outline-none text-white text-lg placeholder:text-slate-600 resize-none min-h-[180px]"
            />
            <div className="flex flex-col sm:flex-row justify-between items-center px-4 pb-4 gap-4 mt-2">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  setUploading(true);
                  const fileName = `${crypto.randomUUID()}.jpg`;
                  await supabase.storage.from('scam-screenshots').upload(fileName, file);
                  const { data: { publicUrl } } = supabase.storage.from('scam-screenshots').getPublicUrl(fileName);
                  await handleAnalysis({ imageUrl: publicUrl });
                  setUploading(false);
              }} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-400 hover:text-white font-bold px-5 py-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon size={20} />} <span>Analyzovat vizuálně</span>
              </button>
              <button onClick={() => handleAnalysis({ text: input })} disabled={loading} className="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-2xl shadow-xl hover:bg-slate-200 disabled:opacity-50 font-black flex items-center justify-center gap-2 transition-transform active:scale-95">
                {loading ? <Loader2 className="animate-spin" /> : <ShieldAlert size={20} />} {result ? "Nová analýza" : "Prověřit hrozbu"}
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <p className="text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ✅ PRO RESULT DASHBOARD */}
        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className={`relative overflow-hidden rounded-[32px] border backdrop-blur-3xl shadow-2xl ${getRiskColor(result.risk)}`}>
              
              {/* Risk Header */}
              <div className="p-10 flex flex-col items-center text-center space-y-6 relative border-b border-white/5">
                <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <ShieldCheck size={12} /> Pro Analysis
                </div>
                
                <div className="relative">
                  <div className={`text-8xl font-black tracking-tighter ${getRiskColor(result.risk).split(' ')[0]}`}>
                    {result.risk}<span className="text-3xl opacity-50">%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    {result.verdict}
                  </h3>
                  <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.3em]">
                    Identifikovaná míra rizika
                  </p>
                </div>
              </div>

              {/* Detailed Analysis Section */}
              <div className="p-10 bg-slate-950/40 space-y-10">
                {result.analysis && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Zap size={16} fill="currentColor" />
                      <h4 className="text-xs font-black uppercase tracking-widest">Hloubková expertíza</h4>
                    </div>
                    <p className="text-slate-200 leading-relaxed text-lg font-light opacity-90">
                      {result.analysis}
                    </p>
                  </div>
                )}

                {/* Threats Grid */}
                {result.threats && result.threats.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {result.threats.map((threat: string, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <AlertCircle size={18} className="text-red-500" />
                        <span className="text-sm font-bold text-slate-300">{threat}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actionable Recommendation */}
                {result.recommendation && (
                  <div className="p-6 rounded-[24px] bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                    <div className="flex items-center gap-3 mb-3 text-purple-400">
                      <Info size={18} />
                      <h4 className="text-xs font-black uppercase tracking-widest text-white">Doporučený postup</h4>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed italic">
                      {result.recommendation}
                    </p>
                  </div>
                )}
              </div>

              {/* Share Footer */}
              <div className="p-6 bg-black/40 flex justify-center border-t border-white/5">
                <button className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold transition-colors uppercase tracking-widest">
                  <Share2 size={14} /> Sdílet bezpečnostní report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}