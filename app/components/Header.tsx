"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, LogOut, Zap, Crown, Star } from "lucide-react";

type Profile = {
  tier: string;
  credits_remaining: number;
};

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  free:  { label: "FREE",  color: "text-slate-400"  },
  easy:  { label: "EASY",  color: "text-blue-400"   },
  basic: { label: "BASIC", color: "text-purple-400" },
  pro:   { label: "PRO",   color: "text-yellow-400" },
};

export default function Header() {
  const [supabase] = useState(() => createClient());
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("tier, credits_remaining")
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

  const tier = profile?.tier || "free";
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.free;

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
          {loading ? (
            <div className="w-36 h-9 bg-white/5 rounded-full animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-[11px] font-black shrink-0">
                {user.email?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div className="flex flex-col leading-none">
                <span className={`text-[9px] font-black uppercase ${tierConfig.color}`}>
                  {tierConfig.label}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {profile !== null
                    ? `${profile.credits_remaining.toLocaleString("cs-CZ")} kreditů`
                    : "načítám…"}
                </span>
              </div>
              {tier === "free" && (
                <Link href="/pricing" className="text-[9px] font-black uppercase bg-purple-600/20 hover:bg-purple-600/40 text-purple-400 px-2 py-1 rounded-full transition-colors hidden sm:block">
                  Upgrade
                </Link>
              )}
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
                className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                title="Odhlásit se"
              >
                <LogOut size={15} />
              </button>
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