"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, Sparkles, LogOut, User, CreditCard, Settings, ReceiptText } from "lucide-react";

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

  const signOut = () => supabase.auth.signOut().then(() => window.location.href = "/");

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-purple-600 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
            <Shield size={18} className="text-white" fill="currentColor" />
          </div>
          <span className="font-black text-lg text-white uppercase tracking-tighter">NeKlikni</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">Analýza</Link>
          <Link href="/pricing" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors">Ceník</Link>
        </nav>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-1.5 pr-3 rounded-full border border-white/5 transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-xs font-black">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-white leading-none">
                      {profile?.tier || 'Free'}
                    </span>
                    <Sparkles size={10} className="text-purple-400" />
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 leading-none mt-0.5">
                    {profile?.credits_remaining ?? 0} kreditů
                  </div>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute top-12 right-0 w-56 bg-slate-900 border border-white/10 rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-white/5 mb-2">
                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Přihlášen jako</p>
                    <p className="text-xs font-bold text-white truncate">{user.email}</p>
                  </div>
                  <Link href="/billing" className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-300 transition-colors">
                    <CreditCard size={14} /> Fakturace & Předplatné
                  </Link>
                  <Link href="/pricing" className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-300 transition-colors">
                    <Sparkles size={14} className="text-purple-400" /> Dokoupit kredity
                  </Link>
                  <Link href="/settings" className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-300 transition-colors">
                    <Settings size={14} /> Změna hesla & Nastavení
                  </Link>
                  <div className="h-px bg-white/5 my-2" />
                  <button onClick={signOut} className="flex items-center gap-2 p-2 w-full hover:bg-red-500/10 rounded-xl text-xs font-bold text-red-400 transition-colors">
                    <LogOut size={14} /> Odhlásit se
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="bg-white text-black px-5 py-2 rounded-lg font-black text-xs hover:bg-slate-200 transition-colors">LOGIN</Link>
          )}
        </div>
      </div>
    </header>
  );
}