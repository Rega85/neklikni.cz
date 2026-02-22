"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  Shield, LogOut, Zap, Crown, Star, ChevronDown,
  User, Receipt, KeyRound
} from "lucide-react";

type Profile = {
  tier: string;
  credits_remaining: number;
  email: string;
};

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  free:  { label: "FREE",  color: "text-slate-400",  bg: "bg-slate-500/10"  },
  easy:  { label: "EASY",  color: "text-blue-400",   bg: "bg-blue-500/10"   },
  basic: { label: "BASIC", color: "text-purple-400", bg: "bg-purple-500/10" },
  pro:   { label: "PRO",   color: "text-yellow-400", bg: "bg-yellow-500/10" },
};

export default function Header() {
  const [supabase] = useState(() => createClient());
  const [user, setUser]         = useState<any>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("tier, credits_remaining, email")
      .eq("id", userId)
      .single();
    if (!error && data) setProfile(data as Profile);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (u) { setUser(u); await loadProfile(u.id); }
      setLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return;
      const u = session?.user || null;
      setUser(u);
      if (u) { await loadProfile(u.id); } else { setProfile(null); }
      setLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tier = profile?.tier || "free";
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.free;

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">

        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="bg-purple-600 p-1.5 rounded-lg">
            <Shield size={18} className="text-white" fill="currentColor" />
          </div>
          <span className="font-black text-lg text-white uppercase tracking-tighter">NeKlikni</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors hidden sm:block">
            Ceník
          </Link>

          {loading ? (
            <div className="w-36 h-9 bg-white/5 rounded-full animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5 transition-colors"
              >
                <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-[11px] font-black shrink-0">
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex flex-col leading-none text-left hidden sm:flex">
                  <span className={`text-[9px] font-black uppercase ${tierConfig.color}`}>{tierConfig.label}</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {profile !== null ? `${profile.credits_remaining.toLocaleString("cs-CZ")} kreditů` : "načítám…"}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  {/* Profil hlavička */}
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-sm font-black">
                        {user.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold truncate max-w-[180px]">{user.email}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${tierConfig.color} ${tierConfig.bg}`}>
                          {tierConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kredity */}
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Kredity</span>
                      <span className="text-white font-black text-lg">
                        {profile?.credits_remaining.toLocaleString("cs-CZ") ?? "—"}
                      </span>
                    </div>
                    {profile && tier !== "free" && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (profile.credits_remaining / (tier === "pro" ? 200 : tier === "basic" ? 50 : 10)) * 100)}%` }}
                        />
                      </div>
                    )}
                    <Link
                      href="/pricing"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase py-2 rounded-xl transition-colors"
                    >
                      <Zap size={12} fill="currentColor" />
                      {tier === "free" ? "Koupit kredity" : "Dobít kredity"}
                    </Link>
                  </div>

                  {/* Navigace */}
                  <div className="p-2">
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <User size={16} className="text-slate-500" /> Můj profil
                    </Link>
                    <Link href="/billing" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <Receipt size={16} className="text-slate-500" /> Fakturace & předplatné
                    </Link>
                    <Link href="/profile#password" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <KeyRound size={16} className="text-slate-500" /> Změna hesla
                    </Link>
                  </div>

                  {/* Odhlášení */}
                  <div className="p-2 border-t border-white/5">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors text-sm">
                      <LogOut size={16} /> Odhlásit se
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/pricing" className="text-purple-400 hover:text-purple-300 text-xs font-black uppercase tracking-widest transition-colors sm:hidden">
                Ceník
              </Link>
              <Link href="/login" className="bg-white text-black px-5 py-2 rounded-lg font-black text-xs hover:bg-slate-200 transition-colors">
                PŘIHLÁSIT
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}