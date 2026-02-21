"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, Sparkles, LogOut, Home, Settings, CreditCard, ChevronDown, User } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ credits_remaining: number; tier: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Rovnou vytvoříme klienta - žádný useRef!
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        // Používáme rychlé getSession místo getUser
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          const { data: profileData } = await supabase
            .from("user_profiles")
            .select("credits_remaining, tier")
            .eq("id", session.user.id)
            .single();
          
          if (mounted && profileData) {
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error("Header load error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from("user_profiles")
          .select("credits_remaining, tier")
          .eq("id", session.user.id)
          .single();
        if (mounted && profileData) {
          setProfile(profileData);
        }
      }
    });

    const channel = supabase.channel('header-credits')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'user_profiles' }, 
        (payload) => {
          if (mounted && payload.new) {
            setProfile(prev => prev ? { 
              ...prev, 
              credits_remaining: payload.new.credits_remaining,
              tier: payload.new.tier || prev.tier
            } : null);
          }
        }
      )
      .subscribe();

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    window.location.href = "/";
  };

  const getTierLabel = (tier: string | undefined) => {
    if (!tier || tier === 'free') return null;
    return tier.toUpperCase();
  };

  const tierLabel = getTierLabel(profile?.tier);

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-md border-b border-white/10 h-20">
      <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between gap-4">
        
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-purple-600 p-2 rounded-xl">
              <Shield size={20} className="text-white" fill="white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-white uppercase hidden sm:block">
              NeKlikni<span className="text-purple-500">.cz</span>
            </span>
          </Link>
          <Link href="/" className="hidden md:flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors">
            <Home size={14} /> Domů
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
          ) : user ? (
            <>
              <Link 
                href="/pricing" 
                className="flex items-center gap-2 bg-slate-900 border border-purple-500/30 hover:border-purple-500/60 px-3 py-2 rounded-xl transition-colors group"
              >
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-sm font-black text-white">
                  {profile?.credits_remaining ?? 0}
                </span>
              </Link>

              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-white/20 p-1.5 pr-3 rounded-2xl transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[10px] font-bold text-slate-400 leading-none mb-0.5 max-w-[120px] truncate">
                      {user.email}
                    </p>
                    {tierLabel && (
                      <p className="text-[9px] font-black text-purple-400 uppercase tracking-tighter">
                        {tierLabel} Verze
                      </p>
                    )}
                  </div>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                    <div className="p-3 border-b border-slate-800">
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <p className="text-sm font-bold text-white mt-1">
                        {profile?.credits_remaining ?? 0} kreditů
                      </p>
                    </div>
                    
                    <div className="py-1">
                      <Link 
                        href="/profile" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <User size={16} /> Můj účet
                      </Link>
                      <Link 
                        href="/pricing" 
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <CreditCard size={16} /> Ceník & Kredity
                      </Link>
                    </div>

                    <div className="border-t border-slate-800 py-1">
                      <button 
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={16} /> Odhlásit se
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                href="/pricing" 
                className="hidden sm:block text-sm font-bold text-slate-400 hover:text-white transition-colors"
              >
                Ceník
              </Link>
              <Link 
                href="/login" 
                className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl transition-colors"
              >
                Přihlásit
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}