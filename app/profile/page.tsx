"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, CreditCard, Zap, ShieldCheck, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ✅ Definice typu místo 'any'
interface UserProfile {
  credits_remaining: number;
  tier: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserEmail(user.email || "");
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
  }, [supabase]);

  // ✅ Funkční napojení na tvůj Stripe backend
  const handlePortal = async () => {
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const resData = await res.json();
      if (resData.url) window.location.href = resData.url;
      else alert("Chyba: " + (resData.error ?? "Nepodařilo se otevřít Stripe Portál."));
    } catch (err) {
      alert("Chyba spojení se serverem.");
    }
  };

  // ✅ Únikový východ (Odhlášení)
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh(); // Aktualizuje navigaci nahoře
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="animate-pulse">Načítám tvůj štít...</div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
      <h1 className="text-2xl font-black mb-4">Nejsi přihlášený</h1>
      <Link href="/login" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-all">Jít na přihlášení</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto pt-12">
        
        {/* Hlavička s e-mailem a odhlášením */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-12 border-b border-slate-800 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black">Tvůj profil</h1>
              <p className="text-slate-400 font-medium">{userEmail}</p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 font-bold transition-colors px-4 py-2 bg-slate-900 border border-slate-800 hover:border-red-500/30 rounded-xl"
          >
            <LogOut size={18} /> Odhlásit se
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Karta s kredity */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
            <Zap className="absolute right-4 top-4 text-yellow-500/10" size={100} />
            <h2 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-2">Dostupné kredity</h2>
            <div className="text-5xl font-black mb-4 tabular-nums">{profile.credits_remaining}</div>
            <Link href="/pricing" className="text-blue-400 font-bold flex items-center gap-2 hover:text-blue-300 transition-colors w-fit">
              Dobít kredity <Zap size={16} />
            </Link>
          </div>

          {/* Karta s tarifem */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl">
            <ShieldCheck className="absolute right-4 top-4 text-blue-500/10" size={100} />
            <h2 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-2">Aktuální tarif</h2>
            <div className={`text-5xl font-black mb-4 uppercase ${profile.tier === 'free' ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500'}`}>
              {profile.tier || 'FREE'}
            </div>
            <p className="text-slate-400">
              {profile.tier === 'pro' || profile.tier === 'elite' 
                ? 'Máš maximální ochranu.' 
                : 'Chceš víc funkcí? Upgraduj svůj plán.'}
            </p>
          </div>
        </div>

        {/* Sekce Nastavení/Platby */}
        {profile.tier !== 'free' && (
          <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
            <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
              <CreditCard size={20} className="text-slate-400" /> Fakturační údaje
            </h3>
            <p className="text-slate-400 mb-6">Platební metodu, historii plateb a faktury spravuješ bezpečně přes Stripe Portál.</p>
            <button 
              onClick={handlePortal}
              className="bg-slate-800 hover:bg-slate-700 py-3 px-8 rounded-xl font-bold transition-all shadow-lg text-white"
            >
              Otevřít Stripe Portál
            </button>
          </div>
        )}
      </div>
    </div>
  );
}