"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Loader2, Share2, AlertCircle, Zap, ShieldCheck, Info } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AnimatedCounter } from "./components/AnimatedCounter";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // OPRAVA: Stabilní klient
  const [supabase] = useState(() => createClient());
  
  const [user, setUser] = useState<any>(null);
  const [authSession, setAuthSession] = useState<any>(null);
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
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user || null);
          setAuthSession(session || null);
          setAuthLoading(false);
        }
      } catch (err) {
        console.error("Auth error:", err);
        if (mounted) setAuthLoading(false);
      }
    };

    loadInitialData();
    
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { if (mounted) setTotalAnalyses(d.total || 0); })
      .catch(console.error);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAuthSession(null);
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setAuthSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleAnalysis = async (payload: { text?: string, imageUrl?: string }) => {
    if (!payload.text?.trim() && !payload.imageUrl) {
      setError("Zadej text nebo nahraj obrázek k prověření.");
      return;
    }

    console.log("--- START ANALÝZY ---");
    
    if (!authSession?.access_token) { 
      console.log("Chybí token v paměti, jdeme na login.");
      router.push("/login"); 
      return; 
    }
    
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      console.log("Odesílám request na API...");
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}` 
        },
        body: JSON.stringify(payload),
      });
      
      console.log("Status odpovědi:", res.status);
      
      const textData = await res.text();
      console.log("RAW Odpověď ze serveru:", textData);
      
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      
      if (res.status === 402) {
        setError("Nemáš dostatek kreditů. Přikup si je v ceníku.");
        router.push("/pricing");
        return;
      }

      let data;
      try {
        data = JSON.parse(textData);
      } catch (e) {
        console.error("Chyba při čtení JSONu:", e);
        setError("API nevrátilo platná data. Zkontroluj konzoli (F12).");
        return;
      }
      
      if (res.ok) {
        console.log("Analýza úspěšná, vykresluji UI.");
        setResult(data);
        setTotalAnalyses(prev => prev + 1);
      } else {
        setError(data.error || "Něco se pokazilo na serveru.");
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError("Chyba: " + (err.message || "Nelze se spojit se serverem."));
    } finally { 
      setLoading(false); 
      console.log("--- KONEC ANALÝZY ---");
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk > 70) return "text-red-500 border-red-500/30 bg-red-500/5 shadow-red-500/20";
    if (risk > 30) return "text-amber-500 border-amber-500/30 bg-amber-500/5 shadow-amber-500/20";
    return "text-emerald-500 border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/20";
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-40 px-6 pb-20 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-16">
        
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
              <button onClick={() => handleAnalysis({ text: input })} disabled={loading || authLoading} className="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-2xl shadow-xl hover:bg-slate-200 disabled:opacity-50 font-black flex items-center justify-center gap-2 transition-transform active:scale-95">
                {loading ? <Loader2 className="animate-spin" /> : <ShieldAlert size={20} />} {result ? "Nová analýza" : "Prověřit hrozbu"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <p className="text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}

        {result && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className={`relative overflow-hidden rounded-[32px] border backdrop-blur-3xl shadow-2xl ${getRiskColor(result.risk)}`}>
              
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}