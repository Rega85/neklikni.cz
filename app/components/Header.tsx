"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, Sparkles, LogOut } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ credits_remaining: number; tier: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let mounted = true;

    // ZÁCHRANNÁ BRZDA pro Header
    const timer = setTimeout(() => {
      if (mounted && loading) setLoading(false);
    }, 3000);

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          const { data: profileData } = await supabase
            .from("user_profiles")
            .select("credits_remaining, tier")
            .eq("id", session.user.id)
            .single();
          if (mounted && profileData) setProfile(profileData);
        }
      } catch (err) {
        console.error("Header error:", err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(timer);
        }
      }
    };

    loadData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (session?.user) {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase, loading]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-md border-b border-white/10 h-20">
      <div className="max-w-5xl mx-auto h-full px-6 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-xl">
            <Shield size={20} className="text-white" fill="white" />
          </div>
          <span className="font-black text-xl text-white uppercase hidden sm:block">NeKlikni</span>
        </Link>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 border border-purple-500/30 px-3 py-2 rounded-xl flex items-center gap-2">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-sm font-black text-white">{profile?.credits_remaining ?? 0}</span>
              </div>
              <button onClick={handleSignOut} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm font-bold text-white bg-purple-600 px-4 py-2 rounded-xl">
              Přihlásit
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}