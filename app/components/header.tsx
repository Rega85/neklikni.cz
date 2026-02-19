"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Coins, UserCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function Header() {
  const [data, setData] = useState<{ id: string, tier: string, credits: number, email: string } | null>(null);
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
          id: user.id,
          tier: profile?.tier || 'free', 
          credits: profile?.credits_remaining || 0,
          email: user.email || "" 
        });

        // ✅ Subscription s filtrem na konkrétního uživatele
        const channel = supabase
          .channel("profile-credits")
          .on("postgres_changes", { 
            event: "UPDATE", 
            schema: "public", 
            table: "user_profiles",
            filter: `id=eq.${user.id}`
          },
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
      }
      setLoading(false);
    }
    getStatus();
  }, [supabase]);

  return (
    <header className="fixed top-0 left-0 w-full border-b border-white/5 bg-slate-950/60 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        <Link href="/" className="text-white font-black text-xl tracking-tighter hover:opacity-80 transition-opacity italic">
          NeKlikni<span className="text-purple-500">.cz</span>
        </Link>

        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-32 animate-pulse bg-white/5 rounded-xl" />
          ) : data ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl">
                <Coins size={16} className="text-yellow-500" />
                <span className="text-sm font-bold text-white tabular-nums">{data.credits}</span>
              </div>

              <Link
                href="/pricing"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-purple-500 text-slate-300 hover:text-purple-400 text-xs font-bold rounded-xl transition-all"
              >
                + Kredity
              </Link>

              <Link 
                href="/profile"
                className="group flex items-center gap-3 px-4 py-1.5 bg-slate-900/50 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition-all rounded-2xl cursor-pointer"
              >
                <UserCircle size={18} className="text-slate-500 group-hover:text-purple-400 transition-colors shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors leading-none hidden sm:block">
                    {data.email}
                  </span>
                  <span className={`text-[9px] font-black uppercase mt-1 px-1.5 py-0.5 rounded-md w-fit shadow-sm ${
                    data.tier === 'pro' ? 'bg-purple-600 text-white' : 
                    data.tier === 'basic' ? 'bg-blue-600 text-white' : 
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {data.tier}
                  </span>
                </div>
              </Link>

              <button
                onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
                className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10"
                title="Odhlásit se"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <Link href="/pricing" className="text-slate-400 hover:text-white font-bold text-sm px-3 transition-colors">
                Ceník
              </Link>
              <Link
                href="/login"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-5 py-2 rounded-xl font-black text-sm text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-105"
              >
                Přihlásit se
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}