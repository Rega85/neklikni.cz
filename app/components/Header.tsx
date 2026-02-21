"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, Sparkles, LogOut, Home } from "lucide-react";

export default function Header() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    
    // Real-time aktualizace kreditů
    const channel = supabase.channel('header-credits')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, 
      payload => setCredits(payload.new.credits_remaining))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-md border-b border-white/10 h-20">
      <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
        
        {/* Levá strana: Logo a odkaz domů */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-purple-600 p-2 rounded-xl">
              <Shield size={20} className="text-white" fill="white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white uppercase hidden xs:block">
              NeKlikni<span className="text-purple-500">.cz</span>
            </span>
          </Link>
          <Link href="/" className="hidden md:flex items-center gap-1 text-slate-500 hover:text-white text-xs font-bold transition-colors">
            <Home size={14} /> Domů
          </Link>
        </div>

        {/* Pravá strana: Kredity a Profil */}
        <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
          {user && (
            <>
              {/* Kredity - Vždy viditelné, kompaktní */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-purple-500/30 px-3 py-1.5 rounded-xl shrink-0">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-sm font-black text-white leading-none">
                  {credits ?? '...'}
                </span>
              </div>

              {/* Uživatelský box */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 pr-3 rounded-2xl shrink-0 max-w-[45px] sm:max-w-none overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user.email?.[0].toUpperCase()}
                </div>
                {/* Email viditelný pouze na PC */}
                <div className="hidden lg:block truncate max-w-[150px]">
                  <p className="text-[10px] font-bold text-slate-400 truncate leading-none mb-1">{user.email}</p>
                  <p className="text-[9px] font-black text-purple-400 uppercase tracking-tighter">PRO Verze</p>
                </div>
                <button 
                  onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
                  className="ml-1 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}