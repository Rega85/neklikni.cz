"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, CreditCard, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      // 1. Zjistíme, kdo je přihlášený
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 2. Vytáhneme jeho data z tabulky user_profiles
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error) setProfile(data);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      Načítám tvůj štít...
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Nejsi přihlášený</h1>
      <Link href="/login" className="bg-blue-600 px-6 py-3 rounded-xl font-bold">Jít na přihlášení</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black">Tvůj profil</h1>
            <p className="text-slate-400">Správa tvého účtu a kreditů</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Karta s kredity */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden">
            <Zap className="absolute right-4 top-4 text-yellow-500/20" size={80} />
            <h2 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-2">Dostupné kredity</h2>
            <div className="text-5xl font-black mb-4">{profile.credits_remaining}</div>
            <Link href="/pricing" className="text-blue-400 font-bold flex items-center gap-2 hover:text-blue-300 transition-colors">
              Dobít kredity <Zap size={16} />
            </Link>
          </div>

          {/* Karta s tarifem */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden">
            <ShieldCheck className="absolute right-4 top-4 text-blue-500/20" size={80} />
            <h2 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-2">Aktuální tarif</h2>
            <div className="text-5xl font-black mb-4 uppercase">{profile.tier || 'FREE'}</div>
            <p className="text-slate-400">
              {profile.tier === 'pro' ? 'Máš maximální ochranu' : 'Chceš víc funkcí? Upgraduj svůj plán.'}
            </p>
          </div>
        </div>

        {/* Sekce Nastavení/Platby */}
        <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center">
          <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
            <CreditCard size={20} /> Fakturační údaje
          </h3>
          <p className="text-slate-400 mb-6">Platební metodu a faktury spravuješ bezpečně přes Stripe Portál.</p>
          <button className="bg-slate-800 hover:bg-slate-700 py-3 px-6 rounded-xl font-bold transition-all">
            Otevřít Stripe Portál
          </button>
        </div>
      </div>
    </div>
  );
}