"use client";
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

function translateError(msg: string): string {
  if (/already registered|already in use|already exists/i.test(msg))
    return 'Tento e-mail je již registrován. Přihlaste se.';
  if (/rate limit|too many/i.test(msg))
    return 'Příliš mnoho pokusů. Zkuste to za chvíli.';
  if (/invalid email/i.test(msg))
    return 'Neplatný formát e-mailu.';
  if (/password/i.test(msg))
    return 'Heslo musí mít alespoň 6 znaků.';
  return 'Registrace se nezdařila. Zkuste to znovu.';
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('Hesla se neshodují.');
      return;
    }
    if (password.length < 6) {
      setError('Heslo musí mít alespoň 6 znaků.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    if (error) {
      setError(translateError(error.message));
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  if (done) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 className="w-20 h-20 text-green-400 mb-6 animate-bounce" />
      <h1 className="text-3xl font-bold text-white mb-4">Zkontroluj e-mail!</h1>
      <p className="text-slate-400">Poslali jsme ti potvrzovací odkaz na <span className="text-white font-bold">{email}</span>.</p>
      <button onClick={() => router.push('/login')} className="mt-8 text-purple-400 hover:text-purple-300 text-sm font-bold transition-colors">
        Zpět na přihlášení
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">Registrace</h1>
        <p className="text-slate-400 mb-8 text-center">Vytvoř si účet a získej 3 analýzy zdarma.</p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-500" size={20} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="karel@novak.cz"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-500" size={20} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Heslo (min. 6 znaků)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-500" size={20} />
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Zopakuj heslo"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-purple-500 outline-none transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password || !passwordConfirm}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? "Registruji..." : <>Vytvořit účet <ArrowRight size={20} /></>}
          </button>
        </form>

        <p className="text-slate-500 text-sm mt-6 text-center">
          Už máš účet?{" "}
          <a href="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
            Přihlásit se
          </a>
        </p>
      </div>
    </div>
  );
}