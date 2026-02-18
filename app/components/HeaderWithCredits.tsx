"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, LogOut, Coins, UserCircle } from "lucide-react";
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
  }, []);

  if (!data) return null;

  return (
    <header className="w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        <Link href="/" className="text-white font-black text-xl tracking-tighter hover:opacity-80 transition-opacity">
          NeKlikni<span className="text-purple-500">.cz</span>
        </Link>

        <div className="flex items-center gap-6">

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
            <Coins size={16} className="text-yellow-500" />
            <span className="text-sm font-bold text-white tabular-nums">{data.credits}</span>
          </div>

          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <UserCircle size={18} className="text-slate-500" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 leading-none">{data.email}</span>
              <span className={`text-[9px] font-black uppercase mt-1 px-1.5 py-0.5 rounded-md w-fit ${
                data.tier === 'pro' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
              }`}>
                {data.tier}
              </span>
            </div>
          </div>

          {data.tier === 'free' && (
            <Link 
              href="/pricing" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-black py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-95"
            >
              UPGRADE
            </Link>
          )}

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