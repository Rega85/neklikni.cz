"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Sparkles, Loader2, Share2 } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/utils/supabase/client";
import { AnimatedCounter } from "./components/AnimatedCounter";

const AnalyzeResponseSchema = z.object({
  risk: z.union([z.number(), z.literal("LIMIT")]),
  verdict: z.string(),
  isLocked: z.boolean().optional(),
  analysis: z.string().optional(),
  threats: z.array(z.string()).optional(),
  recommendation: z.string().optional(),
  newCredits: z.number().optional(),
});

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<z.infer<typeof AnalyzeResponseSchema> | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  // ✅ Načtení dat při startu
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("credits_remaining")
          .eq("id", user.id)
          .single();
        setCredits(profile?.credits_remaining ?? 0);
      }
      
      fetch('/api/stats').then(r => r.json()).then(d => setTotalAnalyses(d.total));
    };
    init();
  }, [supabase]);

  // ✅ Společná logika pro úspěšnou analýzu
  const handleSuccess = (data: any) => {
    const parsed = AnalyzeResponseSchema.safeParse(data);
    if (parsed.success) {
      setResult(parsed.data);
      if (parsed.data.newCredits !== undefined) setCredits(parsed.data.newCredits);
      setTotalAnalyses(prev => prev + 1); // Okamžitý vizuální update komunitního štítu
    }
  };

  const analyzeText = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setShareUrl(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      handleSuccess(data);
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    setUploading(true);
    setResult(null);
    try {
      const fileName = `${crypto.randomUUID()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('scam-screenshots').upload(fileName, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('scam-screenshots').getPublicUrl(fileName);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });
      const data = await res.json();
      handleSuccess(data);
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
      const data = await res.json();
      if (data.url) {
        setShareUrl(data.url);
        await navigator.clipboard.writeText(data.url);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <main className="min-h-[85vh] flex flex-col items-center px-6 pt-24 pb-12 relative">
      
      {/* 💎 KREDITY BADGE */}
      {user && credits !== null && (
        <div className="absolute top-10 right-10 hidden sm:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-purple-500/20 px-4 py-2 rounded-2xl shadow-xl animate-in fade-in slide-in-from-right-4">
          <Sparkles className="text-purple-400" size={16} />
          <span className="text-sm font-black text-white">{credits} <span className="text-slate-500">KREDITŮ</span></span>
        </div>
      )}

      <div className="max-w-3xl w-full space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter italic text-white">
            Prověř <span className="text-purple-500 underline decoration-white/10">než klikneš</span>
          </h1>
          <p className="text-slate-400 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed">
            AI bodyguard pro tvůj klidný internet.
          </p>
        </div>

        <AnimatedCounter endValue={totalAnalyses} />

        {/* INPUT BOX */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 shadow-2xl focus-within:border-purple-500/50 transition-all flex flex-col">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Vlož podezřelou zprávu, SMS nebo odkaz..."
            className="w-full bg-transparent p-6 outline-none text-white text-lg resize-none min-h-[150px]"
          />
          <div className="flex flex-col sm:flex-row justify-between items-center px-4 pb-4 gap-4">
            
            <input type="file" ref={fileInputRef} onChange={handleScreenshotUpload} accept="image/*" className="hidden" />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-slate-400 hover:text-purple-400 transition-colors px-4 py-3 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-purple-500/50 group"
            >
              {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />}
              <span className="text-sm font-bold">{uploading ? "Nahrávám..." : "Screenshot"}</span>
              <span className="text-[9px] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest">PRO</span>
            </button>
            
            <button
              onClick={analyzeText}
              disabled={loading || uploading}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-2xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 font-black text-white flex items-center justify-center gap-2 group active:scale-95"
            >
              {loading ? "Analyzuji..." : (
                <>
                  <ShieldAlert size={20} className="group-hover:scale-110 transition-transform" />
                  {result ? "Prověřit znovu" : "Prověřit zprávu"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* VÝSLEDEK */}
        {result && (
          <div className={`rounded-3xl border overflow-hidden animate-in fade-in slide-in-from-top-4 shadow-2xl
            ${result.risk === "LIMIT" ? 'border-amber-500/50 bg-amber-500/10' : (result.risk as number) > 50 ? 'border-red-500/30 bg-red-950/20' : 'border-green-500/30 bg-green-950/20'}`}>
            
            <div className="p-8 text-center border-b border-white/5">
              <div className={`text-7xl font-black mb-2 ${result.risk === "LIMIT" ? 'text-amber-500' : (result.risk as number) > 50 ? 'text-red-400' : 'text-green-400'}`}>
                {result.risk === "LIMIT" ? "🔒 LIMIT" : `${result.risk}%`}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Míra rizika hrozby</div>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-slate-200 text-lg font-medium italic text-center">"{result.verdict}"</p>
              
              {!result.isLocked && result.analysis && (
                <div className="space-y-6 pt-6 border-t border-white/5">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Hloubková analýza</h4>
                    <p className="text-slate-300 text-sm leading-relaxed">{result.analysis}</p>
                  </div>
                  {result.recommendation && (
                    <div className="p-5 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-1">Doporučení</h4>
                      <p className="text-sm text-purple-100/90 font-medium">{result.recommendation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ACTION BAR */}
            <div className="p-4 border-t border-white/5 bg-slate-900/50 flex flex-col sm:flex-row gap-3">
               <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-all">
                {shareUrl ? "✅ Odkaz zkopírován" : <><Share2 size={16}/> Sdílet výsledek</>}
               </button>
               <button onClick={() => {setInput(""); setResult(null);}} className="flex-1 py-3 bg-transparent hover:bg-white/5 rounded-xl text-sm font-bold text-slate-400 transition-all">
                 Vymazat
               </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}