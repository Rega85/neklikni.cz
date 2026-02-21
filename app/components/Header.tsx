"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, Sparkles, LogOut, Home, User } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ credits_remaining: number; tier: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Čisté vytvoření klienta bez useRef
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        // Okamžité načtení bez čekání na server
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

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
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/pricing" className="flex items-center gap-2 bg-slate-900 border border-purple-500/30 hover:border-purple-500/60 px-3 py-2 rounded-xl transition-colors">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-sm font-black text-white">{profile?.credits_remaining ?? 0}</span>
              </Link>
              
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-300">{user.email}</span>
                <span className="text-[10px] text-purple-400 uppercase font-black">{profile?.tier || 'Free'}</span>
              </div>

              <Link href="/profile" className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Můj účet">
                <User size={18} />
              </Link>
              <button onClick={handleSignOut} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors" title="Odhlásit se">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/pricing" className="hidden sm:block text-sm font-bold text-slate-400 hover:text-white transition-colors">
                Ceník
              </Link>
              <Link href="/login" className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl transition-colors">
                Přihlásit
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}