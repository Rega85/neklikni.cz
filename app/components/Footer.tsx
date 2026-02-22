"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Shield, LogOut, Crown, Zap, User } from "lucide-react";

type Profile = {
  tier: string;
  credits: number;
};

const TIER_LABELS: Record<string, string> = {
  free:  "FREE",
  easy:  "EASY",
  basic: "BASIC",
  pro:   "PRO",
};

const TIER_COLORS: Record<string, string> = {
  free:  "text-slate-400",
  easy:  "text-blue-400",
  basic: "text-purple-400",
  pro:   "text-yellow-400",
};

const TierIcon = ({ tier }: { tier: string }) => {
  if (tier === "pro")   return <Crown size={10} className="text-yellow-400" />;
  if (tier === "basic") return <Zap size={10} className="text-purple-400" />;
  return <User size={10} className="text-slate-400" />;
};

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("tier, credits")
      .eq("id", userId)
      .single();
    if (!error && data) setProfile(data);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (mounted) {
        if (user && !error) {
          setUser(user);
          await loadProfile(user.id);
        }
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        await loadProfile(session.user.id);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const tier = profile?.tier || "free";
  const credits = profile?.credits ?? null;

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
            <div className="w-32 h-9 bg-white/5 rounded-full animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3 bg-white/5 hover:bg-white/8 transition-colors p-1.5 pr-4 rounded-full border border-white/5">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-[11px] font-black shrink-0">
                {user.email?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex flex-col leading-none">
                <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${TIER_COLORS[tier]}`}>
                  <TierIcon tier={tier} />
                  {TIER_LABELS[tier] ?? tier.toUpperCase()}
                </span>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {credits !== null ? `${credits.toLocaleString("cs-CZ")} kreditů` : "načítám..."}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                title="Odhlásit se"
                className="ml-1 text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-400/10"
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