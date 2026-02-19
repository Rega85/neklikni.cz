"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Coins, UserCircle, Settings } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function HeaderWithCredits() {
  const [data, setData] = useState<{ tier: string, credits: number, email: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tier, credits_remaining')
          .eq('id', user.id)
          .single();
        
        setData({ 
          tier: profile?.tier || 'free', 
          credits: profile?.credits_remaining || 0,
          email: user.email || "" 
        });
      }
    }
    getStatus();

    const channel = supabase
      .channel("profile-credits")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_profiles" },
        (payload) => {
          const updated = payload.new as { tier: string; credits_remaining: number };
          setData((prev) => prev ? {
            ...prev,
            tier: updated.tier ?? prev.tier,
            credits: updated.credits_remaining ?? prev.credits,
          } : prev);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handlePortal = async () => {
    const res = await fetch("/api/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else alert("Chyba: " + (data.error ?? "Nepodařilo se otevřít portal"));
  };

  if (!data) return null;

  return (
    <header className="w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        <Link href="/" className="text-white font-black text-xl tracking-tighter hover:opacity-80 transition-opacity">
          NeKlikni<span className="text-purple-500">.cz</span>
        </Link>

        <div className="flex items-center gap-3">

          {/* Kredity */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
            <Coins size={16} className="text-yellow-500" />
            <span className="text-sm font-bold text-white tabular-nums">{data.credits}</span>
          </div>

          {/* Dokoupit kredity */}
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-purple-500 text-slate-300 hover:text-purple-400 text-xs font-bold rounded-xl transition-all"
          >
            + Kredity
          </Link>

          {/* Email + tier */}
          <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <UserCircle size={18} className="text-slate-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 leading-none">{data.email}</span>
              <span className={`text-[9px] font-black uppercase mt-1 px-1.5 py-0.5 rounded-md w-fit ${
                data.tier === 'pro' ? 'bg-purple-600 text-white' : 
                data.tier === 'basic' ? 'bg-blue-600 text-white' : 
                'bg-slate-700 text-slate-400'
              }`}>
                {data.tier}
              </span>
            </div>
          </div>

          {/* Správa předplatného – jen pro placené */}
          {data.tier !== 'free' && (
            <button
              onClick={handlePortal}
              className="text-slate-500 hover:text-blue-400 transition-colors p-2"
              title="Spravovat předplatné"
            >
              <Settings size={20} />
            </button>
          )}

          {/* Odhlásit */}
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
            className="text-slate-500 hover:text-red-400 transition-colors p-2"
            title="Odhlásit se"
          >
            <LogOut size={20} />
          </button>

        </div>
      </div>
    </header>
  );
}