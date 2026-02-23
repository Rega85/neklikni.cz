"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, LogOut, Zap, ChevronDown, User, Receipt, KeyRound, Home } from "lucide-react";

type Profile = { tier: string; credits_remaining: number; };

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  free:  { label: "FREE",  color: "text-slate-400",  bg: "bg-slate-500/10"  },
  easy:  { label: "EASY",  color: "text-blue-400",   bg: "bg-blue-500/10"   },
  basic: { label: "BASIC", color: "text-purple-400", bg: "bg-purple-500/10" },
  pro:   { label: "PRO",   color: "text-yellow-400", bg: "bg-yellow-500/10" },
};

function getTokenFromCookie(): string | null {
  try {
    const all = document.cookie.split("; ");
    const authCookie = all.find((r) => r.includes("sb-") && r.includes("-auth-token="));
    if (!authCookie) return null;
    const raw = authCookie.split("=").slice(1).join("=");
    const decoded = JSON.parse(atob(raw.replace("base64-", "")));
    return decoded.access_token ?? null;
  } catch { return null; }
}

export default function Header() {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("tier, credits_remaining")
        .eq("id", userId)
        .single();
      if (data) setProfile(data as Profile);
    } catch {}
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const token = getTokenFromCookie();
        if (!token) { if (mounted) setLoading(false); return; }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
          { headers: { Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } }
        );

        if (!res.ok) {
          // Expirovaný token — vyčisti sb-* cookies
          document.cookie.split(";").forEach((c) => {
            const name = c.split("=")[0].trim();
            if (name.startsWith("sb-")) {
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            }
          });
          if (mounted) setLoading(false);
          return;
        }

        const u = await res.json();
        if (!mounted) return;
        setUser(u);
        userIdRef.current = u.id;
        await loadProfile(u.id);
      } catch (e) {
        console.warn("Header init:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !session) {
        setUser(null); setProfile(null); userIdRef.current = null;
      } else if (session?.user) {
        setUser(session.user); userIdRef.current = session.user.id;
        await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    // Poslouchej creditsUpdated - pokud event obsahuje novy pocet, pouzij ho primo
    // jinak fetchni z DB
    const onCreditsUpdated = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.credits !== undefined) {
        // Okamzita aktualizace bez DB dotazu
        setProfile((prev) => prev ? { ...prev, credits_remaining: detail.credits } : prev);
      } else if (userIdRef.current) {
        // Fallback: refetch z DB
        await loadProfile(userIdRef.current);
      }
    };
    window.addEventListener("creditsUpdated", onCreditsUpdated);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("creditsUpdated", onCreditsUpdated);
    };
  }, [supabase, loadProfile]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const tier = profile?.tier || "free";
  const tc = TIER_CONFIG[tier] || TIER_CONFIG.free;

  const handleSignOut = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/80 backdrop-blur-xl border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">

        {/* Logo - klikatelné, vede na homepage */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-purple-600 p-1.5 rounded-lg">
              <Shield size={18} className="text-white" fill="currentColor" />
            </div>
            <span className="font-black text-lg text-white uppercase tracking-tighter">NeKlikni.cz</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-4">
            <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors">
              <Home size={13} /> Domů
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/pricing" className="text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-colors hidden sm:block">
            Ceník
          </Link>

          {loading ? (
            <div className="w-28 h-9 bg-white/5 rounded-full animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5 transition-colors"
              >
                <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0">
                  {user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-col leading-none text-left hidden sm:flex">
                  <span className={`text-[9px] font-black uppercase ${tc.color}`}>{tc.label}</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                    {profile !== null ? `${profile.credits_remaining.toLocaleString("cs-CZ")} kreditů` : "načítám..."}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-12 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-sm font-black text-white">
                        {user.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold truncate max-w-[180px]">{user.email}</p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${tc.color} ${tc.bg}`}>{tc.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Kredity</span>
                      <span className="text-white font-black text-lg">{profile?.credits_remaining.toLocaleString("cs-CZ") ?? "—"}</span>
                    </div>
                    {profile && tier !== "free" && (
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-3">
                        <div className="bg-purple-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (profile.credits_remaining / (tier === "pro" ? 200 : tier === "basic" ? 50 : 10)) * 100)}%` }} />
                      </div>
                    )}
                    <Link href="/pricing" onClick={() => setMenuOpen(false)}
                      className="mt-1 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase py-2 rounded-xl transition-colors">
                      <Zap size={12} fill="currentColor" />
                      {tier === "free" ? "Koupit kredity" : "Dobít kredity"}
                    </Link>
                  </div>

                  <div className="p-2">
                    <Link href="/" onClick={() => setMenuOpen(false)} className="sm:hidden flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <Home size={16} className="text-slate-500" /> Domů
                    </Link>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <User size={16} className="text-slate-500" /> Můj profil & kredity
                    </Link>
                    <Link href="/billing" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <Receipt size={16} className="text-slate-500" /> Fakturace & předplatné
                    </Link>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm">
                      <KeyRound size={16} className="text-slate-500" /> Změna hesla
                    </Link>
                  </div>

                  <div className="p-2 border-t border-white/5">
                    <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors text-sm">
                      <LogOut size={16} /> Odhlásit se
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="bg-white text-black px-5 py-2 rounded-lg font-black text-xs hover:bg-slate-200 transition-colors">
              PŘIHLÁSIT
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}