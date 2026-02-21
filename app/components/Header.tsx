"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, Sparkles, LogOut } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session?.user) {
        setUser(session.user);
        // Bezpečné načítání profilu - pokud tabulka neexistuje, kód nespadne
        const { data: p } = await supabase.from("user_profiles").select("*").eq("id", session.user.id).single();
        if (mounted) setProfile(p);
      }
      setLoading(false);
    };
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user || null);
      if (!s) setProfile(null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-purple-600 p-1.5 rounded-lg"><Shield size={18} className="text-white" fill="currentColor" /></div>
          <span className="font-black text-lg text-white uppercase tracking-tighter">NeKlikni</span>
        </Link>

        <div className="flex items-center gap-4">
          {!loading && user ? (
            <div className="flex items-center gap-3 bg-white/5 p-1.5 pr-4 rounded-full border border-white/5">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-[10px] font-black">{user.email?.[0].toUpperCase()}</div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase text-white leading-none">{profile?.tier || 'Uživatel'}</span>
                <span className="text-[9px] font-bold text-slate-500">{profile?.credits_remaining ?? '—'} kreditů</span>
              </div>
              <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")} className="ml-2 text-slate-500 hover:text-red-400 transition-colors">
                <LogOut size={16} />
              </button>
            </div>
          ) : <Link href="/login" className="bg-white text-black px-5 py-2 rounded-lg font-black text-xs hover:bg-slate-200">LOGIN</Link>}
        </div>
      </div>
    </header>
  );
}