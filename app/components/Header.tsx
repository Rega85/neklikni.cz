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
    const timer = setTimeout(() => { if (mounted && loading) setLoading(false); }, 3000);
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session?.user) {
        setUser(session.user);
        const { data: p } = await supabase.from("user_profiles").select("*").eq("id", session.user.id).single();
        if (mounted) setProfile(p);
      }
      setLoading(false); clearTimeout(timer);
    };
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setUser(s?.user || null); if (!s) setProfile(null); setLoading(false); });
    return () => { mounted = false; subscription.unsubscribe(); clearTimeout(timer); };
  }, [supabase]);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-20">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-purple-600 p-2 rounded-xl group-hover:scale-110 transition-transform"><Shield size={20} className="text-white" fill="currentColor" /></div>
          <span className="font-black text-xl text-white uppercase tracking-tighter">NeKlikni</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 font-black uppercase text-[10px] tracking-widest text-slate-500">
          <Link href="/" className="hover:text-white transition-colors">Analýza</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Ceník</Link>
        </nav>
        <div className="flex items-center gap-4">
          {loading ? <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" /> : user ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[9px] font-black uppercase text-slate-600 tracking-tighter">{profile?.tier || 'Free'}</span>
                <div className="flex items-center gap-1 text-white font-black text-sm"><Sparkles size={12} className="text-purple-400" /> {profile?.credits_remaining ?? 0}</div>
              </div>
              <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")} className="p-3 bg-white/5 hover:text-red-400 rounded-2xl transition-all border border-white/5"><LogOut size={18} /></button>
            </div>
          ) : <Link href="/login" className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-xs hover:bg-slate-200 transition-colors">LOGIN</Link>}
        </div>
      </div>
    </header>
  );
}