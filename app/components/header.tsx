"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Coins, UserCircle, Settings, LogIn, Sparkles } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function Header() {
  const [data, setData] = useState<{ tier: string, credits: number, email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function getStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tier, credits_remaining')
          .eq('id', user.id)
          .single();
        
        setData({ 
          tier: profile?.tier || 'free', 
          credits: profile?.credits_remaining || 0,
          email: user.email || "" 
        });
      }
      setLoading(false);
    }
    getStatus();

    const channel = supabase
      .channel("profile-credits")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_profiles" },
        (payload) => {
          const updated = payload.new as { tier: string; credits_remaining: number };
          setData((prev) => prev ? {
            ...prev,
            tier: updated.tier ?? prev.tier,
            credits: updated.credits_remaining ?? prev.credits,
          } : prev);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  return (
    <header className="fixed top-0 left-0 w-full border-b border-white/5 bg-slate-950/60 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-white font-black text-xl tracking-tighter hover:opacity-80 transition-opacity italic">
          NeKlikni<span className="text-purple-500">.cz</span>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-8 animate-pulse bg-white/5 rounded-full" />
          ) : data ? (
            /* ✅ PŘIHLÁŠENÝ - uvidíš svých 550 kreditů */
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
                <Coins size={16} className="text-yellow-500" />
                <span className="text-sm font-bold text-white tabular-nums">{data.credits}</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <UserCircle size={18} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-200 hidden sm:inline">{data.email}</span>
              </div>
              <button onClick={() => supabase.auth.signOut().then(() => router.refresh())}>
                <LogOut size={20} className="text-slate-500 hover:text-red-500 transition-colors" />
              </button>
            </>
          ) : (
            /* ✅ HOST - uvidíš tlačítka pro registraci */
            <>
              <Link href="/pricing" className="text-slate-400 hover:text-white font-bold text-sm px-3">Ceník</Link>
              <Link href="/login" className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-2 rounded-xl font-black text-sm shadow-lg">
                Přihlásit se
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}