"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AnimatedCounter } from "./components/AnimatedCounter";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch('/api/stats').then(r => r.json()).then(d => setTotalAnalyses(d.total || 0));
  }, [supabase]);

  const handleAnalysis = async (payload: { text?: string, imageUrl?: string }) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setTotalAnalyses(prev => prev + 1);
        // Refreshneme router, aby se kredity v Headeru hned pohnuly
        router.refresh(); 
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    // ✅ pt-40 na mobilu a pt-48 na PC zajistí, že nadpis nebude pod lištou
    <main className="min-h-screen bg-slate-950 text-white pt-40 sm:pt-48 px-6 pb-20 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-16">
        
        {/* Nadpis a podnadpis */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl sm:text-7xl font-black italic uppercase tracking-tighter leading-tight">
            Prověř <span className="text-purple-500 underline decoration-white/10">než klikneš</span>
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl font-medium">
            AI bodyguard pro tvůj klidný internet.
          </p>
        </div>

        <AnimatedCounter endValue={totalAnalyses} />

        {/* Input sekce - vylepšené odsazení a stíny */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl focus-within:border-purple-500/50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Vlož podezřelou zprávu, SMS nebo odkaz..."
            className="w-full bg-transparent p-6 outline-none text-white text-lg resize-none min-h-[160px]"
          />
          <div className="flex flex-col sm:flex-row justify-between items-center px-4 pb-4 gap-4 mt-2">
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                const fileName = `${crypto.randomUUID()}.jpg`;
                await supabase.storage.from('scam-screenshots').upload(fileName, file);
                const { data: { publicUrl } } = supabase.storage.from('scam-screenshots').getPublicUrl(fileName);
                await handleAnalysis({ imageUrl: publicUrl });
                setUploading(false);
              }} 
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-400 hover:text-purple-400 font-bold px-4 py-3 bg-slate-950 rounded-xl border border-slate-800 transition-colors"
            >
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
              <span>Screenshot</span>
              <span className="text-[9px] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest">PRO</span>
            </button>
            
            <button
              onClick={() => handleAnalysis({ text: input })}
              disabled={loading || uploading}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 px-10 py-4 rounded-2xl shadow-lg shadow-purple-500/20 disabled:opacity-50 font-black flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldAlert size={20} />}
              {result ? "Prověřit znovu" : "Prověřit zprávu"}
            </button>
          </div>
        </div>

        {/* Výsledek analýzy */}
        {result && (
          <div className="bg-slate-900 border border-purple-500/20 rounded-3xl p-8 animate-in fade-in slide-in-from-top-4 shadow-2xl">
            <div className="text-center mb-8">
              <div className="text-7xl font-black text-purple-500 mb-2">{result.risk}%</div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Míra rizika hrozby</div>
            </div>
            <p className="text-2xl text-center italic font-medium leading-relaxed">"{result.verdict}"</p>
            
            {result.analysis && (
              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Hloubková analýza</h4>
                <p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}