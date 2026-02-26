"use client";
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

type Mode = "password" | "magic";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<Mode>("password");
  const [error, setError] = useState('');
  
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Špatný e-mail nebo heslo.");
        setLoading(false); // Vypneme loading jen při chybě
      } else {
        window.location.href = '/';
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setError("Chyba: " + error.message);
        setLoading(false);
      } else {
        setSubmitted(true);
        setLoading(false);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Zadej nejdřív svůj e-mail do políčka nahoře.");
      return;
    }
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    setLoading(false);

    if (error) {
      setError("Chyba: " + error.message);
    } else {
      alert("Koukni do schránky! Poslali jsme ti odkaz na obnovu hesla.");
    }
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
        <p className="text-slate-400 mb-8">
          {mode === "password" ? "Přihlas se e-mailem a heslem." : "Pošleme ti magický odkaz."}
        </p>

        {/* Přepínač módu */}
        <div className="flex bg-slate-950 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === "password" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Heslo
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === "magic" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Magic link
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
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

          {/* Heslo – jen pro password mode */}
          {mode === "password" && (
            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-slate-500" size={20} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Heslo"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-purple-500 outline-none transition-colors"
                />
              </div>
              <div className="flex justify-end pr-2">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs font-medium text-slate-500 hover:text-purple-400 transition-colors"
                >
                  Zapomenuté heslo?
                </button>
              </div>
            </div>
          )}

          {/* Chybová hláška */}
          {error && (
            <p className="text-red-400 text-sm font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || (mode === "password" && !password)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? "Zpracovávám..." : <>
              {mode === "password" ? "Přihlásit se" : "Poslat magic link"}
              <ArrowRight size={20} />
            </>}
          </button>
        </form>

        {/* Registrace */}
        <p className="text-slate-500 text-sm mt-6">
          Nemáš účet?{" "}
          <a href="/register" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
            Zaregistruj se
          </a>
        </p>

      </div>
    </div>
  );
}