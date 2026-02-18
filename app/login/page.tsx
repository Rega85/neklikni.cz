"use client";
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) alert("Chyba: " + error.message);
    else setSubmitted(true);
    setLoading(false);
  };

  if (submitted) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 className="w-20 h-20 text-green-400 mb-6 animate-bounce" />
      <h1 className="text-3xl font-bold text-white mb-4">Zkontroluj e-mail!</h1>
      <p className="text-slate-400">Poslali jsme ti odkaz na {email}.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Přihlášení</h1>
        <p className="text-slate-400 mb-8">Zadej e-mail. Pošleme ti magický odkaz.</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-500" size={20} />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="karel@novak.cz" className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" />
          </div>
          <button type="submit" disabled={loading || !email} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
            {loading ? "Odesílám..." : <>Získat přístup <ArrowRight size={20} /></>}
          </button>
        </form>

        {/* 🔥 TAJNÉ DEV TLAČÍTKO PRO OBEJITÍ LIMITŮ 🔥 */}
        <button 
          type="button"
          onClick={async () => {
            const { error } = await supabase.auth.signInWithPassword({
              email: 'test@test.cz', 
              password: 'Neklikni2026!'
            });
            if (!error) {
              window.location.href = '/pricing';
            } else {
              alert("Chyba hesla: " + error.message);
            }
          }}
          className="mt-8 w-full p-4 bg-red-900/30 border border-red-500/50 text-red-400 font-bold rounded-xl hover:bg-red-800/40 transition-colors"
        >
          🔥 DEV HACK LOGIN (Bez mailu)
        </button>

      </div>
    </div>
  );
}