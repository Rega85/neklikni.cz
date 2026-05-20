"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { LogOut, Zap, ChevronDown, User, KeyRound, Home, Receipt, Sparkles, Gift, BookOpen, Menu, X, Tag, Database } from "lucide-react";
import BrandLogo from "./BrandLogo";

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  free:  { label: "FREE",  color: "text-slate-400",  bg: "bg-slate-500/10"  },
  easy:  { label: "EASY",  color: "text-blue-400",   bg: "bg-blue-500/10"   },
  basic: { label: "BASIC", color: "text-purple-400", bg: "bg-purple-500/10" },
  pro:   { label: "PRO",   color: "text-yellow-400", bg: "bg-yellow-500/10" },
};

export default function Header() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) { setUser(data.user); setProfile(data.profile); }
      } else {
        if (mountedRef.current) { setUser(null); setProfile(null); }
      }
    } catch {
      if (mountedRef.current) { setUser(null); setProfile(null); }
    } finally {
      if (mountedRef.current) setInitialLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchMe();
    const handleUpdate = () => fetchMe();
    window.addEventListener("creditsUpdated", handleUpdate);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("creditsUpdated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) setMobileNavOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile drawer when route changes (Link click)
  const closeMobile = () => setMobileNavOpen(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const tier = profile?.tier || "free";
  const tc = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const credits = profile?.credits_remaining ?? 0;
  const maxCredits = tier === "pro" ? 200 : tier === "basic" ? 50 : tier === "easy" ? 10 : 0;

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">

        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <BrandLogo size={32} className="group-hover:scale-105 transition-transform" />
            <span className="font-black text-lg text-white uppercase tracking-tighter">
              NEKLIKNI<span className="brand-gradient-text">.CZ</span>
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
              <Home size={13} /> Domů
            </Link>
            <Link href="/blog" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
              <BookOpen size={13} /> Blog
            </Link>
            <Link href="/databaze" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
              <Database size={13} /> Databáze
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Upgrade CTA: prominent for free users, subtle "Ceník" otherwise — desktop only */}
          {!initialLoading && user && tier === "free" ? (
            <Link
              href="/pricing"
              className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-[11px] font-black uppercase tracking-widest px-3.5 py-2 rounded-full shadow-lg shadow-purple-500/25 transition-all active:scale-95"
            >
              <Sparkles size={12} fill="currentColor" />
              <span>Upgraduj</span>
            </Link>
          ) : (
            <Link href="/pricing" className="hidden sm:inline-block text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Ceník</Link>
          )}

          {/* Mobile hamburger — visible only on small screens */}
          <div className="sm:hidden relative" ref={mobileNavRef}>
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label={mobileNavOpen ? "Zavřít menu" : "Otevřít menu"}
              aria-expanded={mobileNavOpen}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
            >
              {mobileNavOpen ? <X size={18} className="text-white" /> : <Menu size={18} className="text-white" />}
            </button>

            {mobileNavOpen && (
              <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-up">
                <div className="p-2 space-y-0.5">
                  <Link href="/" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                    <Home size={16} className="text-slate-500 shrink-0" /><span>Domů</span>
                  </Link>
                  <Link href="/blog" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                    <BookOpen size={16} className="text-slate-500 shrink-0" /><span>Blog</span>
                  </Link>
                  <Link href="/databaze" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                    <Database size={16} className="text-slate-500 shrink-0" /><span>Databáze</span>
                  </Link>
                  <Link href="/pricing" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                    <Tag size={16} className="text-slate-500 shrink-0" /><span>Ceník</span>
                  </Link>
                  {user && (
                    <Link href="/referral" onClick={closeMobile} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm font-semibold">
                      <Gift size={16} className="text-emerald-400 shrink-0" /><span>Pozvi přátele <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider ml-1">+5</span></span>
                    </Link>
                  )}
                </div>

                {!initialLoading && user && tier === "free" && (
                  <div className="p-2 border-t border-white/5">
                    <Link
                      href="/pricing"
                      onClick={closeMobile}
                      className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-widest px-3 py-2.5 rounded-xl shadow-lg shadow-purple-500/25 transition-all"
                    >
                      <Sparkles size={12} fill="currentColor" /> Upgraduj
                    </Link>
                  </div>
                )}

                {!initialLoading && !user && (
                  <div className="p-2 border-t border-white/5">
                    <Link
                      href="/login"
                      onClick={closeMobile}
                      className="flex items-center justify-center bg-white text-black px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors"
                    >
                      Přihlásit
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {initialLoading ? (
            <div className="w-28 h-9 bg-white/5 rounded-full animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Otevřít menu účtu" aria-expanded={menuOpen} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5 transition-colors">
                <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0">
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex flex-col leading-none text-left hidden sm:flex">
                  <span className={`text-[9px] font-black uppercase ${tc.color}`}>{tc.label}</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5">{profile !== null ? `${credits.toLocaleString("cs-CZ")} kreditů` : "načítám..."}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-purple-600 rounded-full flex items-center justify-center text-base font-black text-white shrink-0">{user.email?.[0]?.toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-bold truncate">{user.email}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${tc.color} ${tc.bg}`}>{tc.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Zbývající kredity</span>
                      <span className="text-white font-black text-xl">{credits.toLocaleString("cs-CZ")}</span>
                    </div>
                    {maxCredits > 0 && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (credits / maxCredits) * 100)}%` }} />
                      </div>
                    )}
                    <Link href="/pricing" onClick={() => setMenuOpen(false)} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase py-2.5 rounded-xl transition-colors">
                      <Zap size={12} fill="currentColor" /> {tier === "free" ? "Koupit kredity" : "Dobít kredity"}
                    </Link>
                  </div>

                  <div className="p-2 space-y-0.5">
                    <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <Home size={16} className="text-slate-500 shrink-0" /><span>Hlavní stránka</span>
                    </Link>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <User size={16} className="text-slate-500 shrink-0" /><span>Můj profil</span>
                    </Link>
                    <Link href="/billing" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <Receipt size={16} className="text-slate-500 shrink-0" /><span>Fakturace & předplatné</span>
                    </Link>
                    <Link href="/referral" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <Gift size={16} className="text-emerald-400 shrink-0" /><span>Pozvi přátele <span className="text-emerald-400 text-[10px] font-black uppercase tracking-wider ml-1">+5 kreditů</span></span>
                    </Link>
                    <Link href="/update-password" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <KeyRound size={16} className="text-slate-500 shrink-0" /><span>Změna hesla</span>
                    </Link>
                  </div>

                  <div className="p-2 border-t border-white/5">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors text-sm">
                      <LogOut size={16} className="shrink-0" /><span>Odhlásit se</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-block text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Přihlásit
              </Link>
              <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-1.5 brand-gradient text-white text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:brightness-110 transition-all active:scale-95"
              >
                <Sparkles size={12} fill="currentColor" />
                Vyzkoušet zdarma
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
