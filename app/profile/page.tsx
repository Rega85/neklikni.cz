"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase.from("user_profiles").select("*").eq("id", session.user.id).single();
          if (mounted) setProfile(data);
        }
      } catch (err) {
        console.error("Chyba načítání profilu:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white pt-28 px-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Můj Profil</h1>
        <div className="bg-slate-900/40 border border-white/10 p-6 rounded-2xl">
          <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Aktuální tarif</p>
          <p className="text-2xl font-black text-white">{profile?.tier?.toUpperCase() || "FREE"}</p>
        </div>
      </div>
    </main>
  );
}