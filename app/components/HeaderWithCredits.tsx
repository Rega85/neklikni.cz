"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Settings, LogOut, ChevronDown, Coins } from "lucide-react";
import { createClient } from "@/utils/supabase/client"; // ✅ tvoje cesta

type Tier = "free" | "basic" | "pro";

interface UserData {
  email: string;
  tier: Tier;
  credits: number;
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; bgColor: string }> = {
  free:  { label: "FREE",  color: "text-gray-400",   bgColor: "bg-gray-700/60"   },
  basic: { label: "BASIC", color: "text-blue-400",   bgColor: "bg-blue-900/40"   },
  pro:   { label: "PRO",   color: "text-yellow-400", bgColor: "bg-yellow-900/30" },
};

export default function HeaderWithCredits() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creditsFlash, setCreditsFlash] = useState(false);
  const supabase = createClient();

  const flash = () => {
    setCreditsFlash(true);
    setTimeout(() => setCreditsFlash(false), 1000);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ tvoje reálné názvy: user_profiles + credits_remaining
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("tier, credits_remaining")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUserData({
          email: user.email ?? "",
          tier: (profile.tier as Tier) ?? "free",
          credits: profile.credits_remaining ?? 0,
        });
      }
    };

    fetchUser();

    // Real-time – blikne po Stripe webhooku bez refreshe stránky
    const channel = supabase
      .channel("profile-credits")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_profiles" },
        (payload) => {
          const updated = payload.new as { tier: Tier; credits_remaining: number };
          setUserData((prev) =>
            prev ? {
              ...prev,
              tier: updated.tier ?? prev.tier,
              credits: updated.credits_remaining ?? prev.credits,
            } : prev
          );
          flash();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!userData) return null;

  const tierConfig = TIER_CONFIG[userData.tier];
  const isFreeTier = userData.tier === "free";

  return (
    <header className="w-full border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">

        <Link href="/" className="text-white font-black text-xl tracking-tighter">
          NeKlikni<span className="text-blue-500">.cz</span>
        </Link>

        <div className="flex items-center gap-3">

          {/* Credits counter s flash animací */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300
            ${creditsFlash
              ? "border-yellow-500/80 bg-yellow-900/20 scale-105"
              : "border-slate-800 bg-slate-900"
            }`}>
            <Coins className={`w-4 h-4 transition-colors ${creditsFlash ? "text-yellow-300" : "text-yellow-500"}`} />
            <span className={`text-sm font-bold tabular-nums transition-colors ${creditsFlash ? "text-yellow-300" : "text-white"}`}>
              {userData.credits}
            </span>
          </div>

          {/* Upgrade – jen pro free */}
          {isFreeTier && (
            <Link href="/pricing" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-all shadow-lg shadow-blue-500/20">
              UPGRADE
            </Link>
          )}

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${tierConfig.bgColor} ${tierConfig.color}`}>
                {tierConfig.label}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50 overflow-hidden">
                  
                  <div className="px-4 py-3 border-b border-slate-800">
                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Přihlášen jako</p>
                    <p className="text-sm text-white truncate font-medium">{userData.email}</p>
                  </div>

                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors">
                    <Settings size={16} /> Nastavení profilu
                  </Link>

                  {isFreeTier && (
                    <Link href="/pricing" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-blue-400 hover:bg-slate-800 transition-colors">
                      <Zap size={16} /> Upgradovat plán
                    </Link>
                  )}

                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left border-t border-slate-800">
                    <LogOut size={16} /> Odhlásit se
                  </button>

                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}