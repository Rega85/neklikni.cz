"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, Sparkles, LogOut, User, CreditCard } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session?.user) {
        setUser(session.user);
        const { data: p } = await supabase.from("user_profiles").select("*").eq("id", session.user.id).single();
        if (mounted) setProfile(p);
      }
      setLoading(false);
    };
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user || null);
      if (!s) setProfile(null);
      setLoading(false);
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

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Analýza</Link>
          <Link href="/pricing" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">Ceník</Link>
        </nav>

        <div className="flex items-center gap-4">
          {!loading && user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-3 bg-white/5 p-1.5 pr-3 rounded-full border border-white/5">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-xs font-black">{user.email?.[0].toUpperCase()}</div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1"><span className="text-[9px] font-black uppercase text-white leading-none">{profile?.tier || 'Free'}</span><Sparkles size={8} className="text-purple-400" /></div>
                  <div className="text-[9px] font-bold text-slate-500 leading-none mt-1">{profile?.credits_remaining ?? 0} kreditů</div>
                </div>
              </button>
              {menuOpen && (
                <div className="absolute top-12 right-0 w-48 bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95">
                  <Link href="/pricing" className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-300"><CreditCard size={14} /> Dokoupit kredity</Link>
                  <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")} className="flex items-center gap-2 p-2 w-full hover:bg-red-500/10 rounded-xl text-xs font-bold text-red-400"><LogOut size={14} /> Odhlásit se</button>
                </div>
              )}
            </div>
          ) : <Link href="/login" className="bg-white text-black px-5 py-2 rounded-lg font-black text-xs">LOGIN</Link>}
        </div>
      </div>
    </header>
  );
}