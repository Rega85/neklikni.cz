"use client";

import { useState, useEffect } from "react"; // ✅ Přidán useEffect
import { useRouter } from "next/navigation";
import { ShieldAlert, Image as ImageIcon, Sparkles } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/utils/supabase/client"; // ✅ Přidán import klienta

const AnalyzeResponseSchema = z.object({
  risk: z.union([z.number(), z.literal("LIMIT")]),
  verdict: z.string(),
  isLocked: z.boolean().optional(),
  analysis: z.string().optional(),
  threats: z.array(z.string()).optional(),
  recommendation: z.string().optional(),
});

export default function Home() {
  const router = useRouter();
  const supabase = createClient(); // ✅ Inicializace klienta
  const [user, setUser] = useState<any>(null); // ✅ Stav pro uživatele
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [result, setResult] = useState<z.infer<typeof AnalyzeResponseSchema> | null>(null);

  // ✅ Načtení uživatele při startu
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

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

      if (response.status === 401) {
        setResult({ risk: "LIMIT", verdict: "Získej 3 analýzy zdarma! Stačí se jen přihlásit." });
        return;
      }
      if (response.status === 402) {
        setResult({ risk: "LIMIT", verdict: "Dosáhl jsi svého limitu. Odemkni neomezenou ochranu!" });
        return;
      }
      if (!response.ok) {
        setResult({ risk: 0, verdict: "Něco se pokazilo. Zkus to znovu." });
        return;
      }

      const parsed = AnalyzeResponseSchema.safeParse(rawData);
      if (!parsed.success) {
        setResult({ risk: 0, verdict: "Systém vrátil neplatná data." });
        return;
      }
      setResult(parsed.data);
    } catch {
      setResult({ risk: 0, verdict: "Chyba spojení. Zkontrolujte internet." });
    } finally {
      setLoading(false);
    }
  };

  const handleFakeDoor = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const riskNum = result && !isNaN(Number(result.risk)) ? Number(result.risk) : 0;
  const isHigh = riskNum > 50;

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center px-6 pt-32 pb-20 relative">

      {/* ... Toast zůstává stejný ... */}

      <div className="max-w-3xl w-full space-y-10">
        
        {/* ... Hero sekce zůstává stejná ... */}

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
              <span className="ml-2 text-[9px] bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-0.5 rounded-md font-black uppercase tracking-widest">PRO</span>
            </button>
            
            <button
              onClick={analyzeScam}
              disabled={loading}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 px-8 py-3 rounded-2xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 font-black text-white flex items-center justify-center gap-2 group active:scale-95"
            >
              {loading ? (
                "Analyzuji..."
              ) : (
                <>
                  <ShieldAlert size={20} className="group-hover:scale-110 transition-transform" />
                  {/* ✅ Inteligentní CTA podle stavu */}
                  {result 
                    ? "Prověřit znovu" 
                    : user 
                      ? "Prověřit zprávu" 
                      : "Prověřit zdarma"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ... Zbytek (result rendering) zůstává stejný ... */}

      </div>
    </main>
  );
}