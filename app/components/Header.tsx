"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, Sparkles, LogOut, User } from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ credits_remaining: number; tier: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let mounted = true;

    // ZÁCHRANNÁ BRZDA: Pokud se session nenačte do 3s, odemkneme Header
    const rescueTimer = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 3000);

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          // Načtení kreditů přímo z DB
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
        console.error("Chyba v Headeru:", err);
      } finally {
        if (mounted) {
          setLoading(false);
          clearTimeout(rescueTimer);
        }
      }
    };

    loadData();

    // Posluchač na změny přihlášení (např. po analýze nebo odhlášení)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (session?.user) {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(rescueTimer);
    };
  }, [supabase]);

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
          <span className="font-black text-xl text-white uppercase tracking-tighter">
            NeKlikni<span className="text-purple-500">.cz</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Zobrazení kreditů */}
              <div className="flex items-center gap-2 bg-slate-900 border border-purple-500/30 px-3 py-2 rounded-xl">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-sm font-black text-white">
                  {profile?.credits_remaining ?? 0}
                </span>
              </div>
              
              {/* Ikona profilu / odhlášení */}
              <button 
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                title="Odhlásit se"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link 
              href="/login" 
              className="text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl transition-colors"
            >
              Přihlásit
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}