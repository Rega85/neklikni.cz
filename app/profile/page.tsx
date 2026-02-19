"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, CreditCard, Zap, ShieldCheck, LogOut, Lock, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserProfile {
  credits_remaining: number;
  tier: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  // Stavy pro změnu hesla
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

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

  // 💳 Přesměrování do Stripe (Změna tarifu / Zrušení)
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

  // 🔐 Manuální změna hesla
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Heslo musí mít alespoň 6 znaků." });
      return;
    }
    
    setPasswordLoading(true);
    setPasswordMessage({ type: "", text: "" });

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordMessage({ type: "error", text: "Chyba: " + error.message });
    } else {
      setPasswordMessage({ type: "success", text: "Heslo bylo úspěšně změněno!" });
      setNewPassword(""); // Vymaže pole
    }
    setPasswordLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="animate-pulse font-bold text-xl">Načítám nastavení...</div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
      <h1 className="text-2xl font-black mb-4">Nejsi přihlášený</h1>
      <Link href="/login" className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-bold transition-all">Jít na přihlášení</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto pt-12 space-y-8">
        
        {/* Hlavička */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20">
              <User size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Nastavení účtu</h1>
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

        {/* =========================================
            1. SEKCE: TARIF A KREDITY
        ========================================= */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Kredity */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl flex flex-col">
            <Zap className="absolute right-4 top-4 text-yellow-500/10" size={100} />
            <h2 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-2">Dostupné kredity</h2>
            <div className="text-5xl font-black mb-6 tabular-nums">{profile.credits_remaining}</div>
            
            <div className="mt-auto">
              <Link href="/pricing" className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-xl font-bold transition-all border border-slate-700 hover:border-slate-500">
                <Zap size={18} className="text-yellow-400" /> Dokoupit kredity
              </Link>
            </div>
          </div>

          {/* Tarif */}
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl flex flex-col">
            <ShieldCheck className="absolute right-4 top-4 text-purple-500/10" size={100} />
            <h2 className="text-slate-400 font-bold uppercase tracking-wider text-sm mb-2">Aktuální tarif</h2>
            <div className={`text-5xl font-black mb-6 uppercase ${profile.tier === 'free' ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500'}`}>
              {profile.tier || 'FREE'}
            </div>
            
            <div className="mt-auto">
              {profile.tier === 'free' ? (
                <Link href="/pricing" className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-3 px-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20">
                  <ShieldCheck size={18} /> Přejít na PRO
                </Link>
              ) : (
                <button 
                  onClick={handlePortal}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 px-4 rounded-xl font-bold transition-all border border-slate-700 hover:border-slate-500"
                >
                  <CreditCard size={18} /> Změnit tarif / Zrušit předplatné
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =========================================
            2. SEKCE: BEZPEČNOST A HESLO
        ========================================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-800 rounded-lg"><KeyRound size={20} className="text-slate-300" /></div>
            <h3 className="text-xl font-bold">Změna hesla</h3>
          </div>
          
          <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-500" size={20} />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Zadej nové bezpečné heslo"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-purple-500 transition-colors text-white"
              />
            </div>
            
            {passwordMessage.text && (
              <p className={`text-sm font-medium ${passwordMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {passwordMessage.text}
              </p>
            )}

            <button
              type="submit"
              disabled={passwordLoading || newPassword.length < 6}
              className="py-3 px-6 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-white transition-all disabled:opacity-50 border border-slate-700"
            >
              {passwordLoading ? "Ukládám..." : "Aktualizovat heslo"}
            </button>
          </form>
        </div>

        {/* =========================================
            3. SEKCE: FAKTURACE (Pouze pro PRO)
        ========================================= */}
        {profile.tier !== 'free' && (
          <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
            <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
              <CreditCard size={20} className="text-slate-400" /> Faktury a platební metody
            </h3>
            <p className="text-slate-400 mb-6 text-sm">
              Potřebuješ stáhnout fakturu pro účetní nebo změnit kreditní kartu? Vše najdeš v zákaznickém portálu Stripe.
            </p>
            <button 
              onClick={handlePortal}
              className="bg-slate-800 hover:bg-slate-700 py-3 px-8 rounded-xl font-bold transition-all shadow-lg text-white"
            >
              Otevřít fakturační portál
            </button>
          </div>
        )}

      </div>
    </div>
  );
}