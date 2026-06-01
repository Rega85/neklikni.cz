"use client";
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';

type Mode = "password" | "magic";

function translateAuthError(raw: string | null): string {
  if (!raw) return '';
  const msg = raw.toLowerCase();
  if (msg.includes('expired') || msg.includes('link_expired'))
    return 'Odkaz už není platný (vypršel nebo byl použit). Pošli si nový níže.';
  if (msg.includes('access_denied') || msg.includes('otp_expired'))
    return 'Odkaz vypršel. Pošli si nový níže.';
  if (msg === 'prihlaseni_selhalo')
    return 'Přihlášení se nepodařilo. Zkus to znovu, nebo si pošli nový odkaz.';
  return decodeURIComponent(raw).replace(/\+/g, ' ');
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<Mode>("password");

  const searchParams = useSearchParams();
  // Accept both ?next= (preferred) and legacy ?redirect=.
  const redirectTo = searchParams.get('next') ?? searchParams.get('redirect');
  const initialError = translateAuthError(searchParams.get('error'));
  const [error, setError] = useState(initialError);

  // Validate redirect: must be a relative path whose second char is not "/" or
  // "\" (protects against open-redirect attacks via "//evil.com", "/\evil.com"
  // or "https://..."). Query strings like "/pricing?plan=basic" are allowed.
  const safeRedirect = (() => {
    if (!redirectTo) return '/';
    if (!/^\/[^/\\]/.test(redirectTo)) return '/';
    return redirectTo;
  })();

  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
      },
    });
    if (error) {
      setError('Přihlášení přes Google selhalo. Zkus to znovu.');
      setGoogleLoading(false);
    }
    // On success: browser navigates to Google — no cleanup needed
  };

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
        window.location.href = safeRedirect;
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
        },
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
      <p className="text-slate-400 max-w-md">
        Poslali jsme ti přihlašovací odkaz na <span className="text-white font-bold">{email}</span>.
        Klikni na něj a jsi přihlášen — žádné heslo není potřeba.
      </p>
      <p className="text-slate-500 text-sm mt-4 max-w-md">
        Nedorazil? Zkontroluj složku <span className="text-slate-300">Spam / Hromadné</span>.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Přihlášení</h1>
        <p className="text-slate-400 mb-6">
          {mode === "password"
            ? "Přihlas se e-mailem a heslem."
            : "Pošleme ti e-mailem odkaz, klikneš a jsi přihlášen."}
        </p>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-4 rounded-xl border border-gray-200 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-5"
        >
          <GoogleIcon />
          {googleLoading ? 'Přesměrovávám…' : 'Pokračovat přes Google'}
        </button>

        {/* Oddělovač */}
        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-900 px-3 text-xs text-slate-500 uppercase tracking-widest">nebo</span>
          </div>
        </div>

        {/* Přepínač módu */}
        <div className="flex bg-slate-950 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode("password"); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === "password" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Heslem
          </button>
          <button
            type="button"
            onClick={() => { setMode("magic"); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === "magic" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            Odkazem v e-mailu
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
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none transition-colors"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 focus:outline-none transition-colors"
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
            disabled={loading || googleLoading || !email || (mode === "password" && !password)}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? "Zpracovávám..." : <>
              {mode === "password" ? "Přihlásit se" : "Poslat přihlašovací odkaz"}
              <ArrowRight size={20} />
            </>}
          </button>
        </form>

        {/* Registrace */}
        <p className="text-slate-500 text-sm mt-6">
          Nemáš účet?{" "}
          <a
            href={safeRedirect !== '/' ? `/register?next=${encodeURIComponent(safeRedirect)}` : "/register"}
            className="text-purple-400 hover:text-purple-300 font-bold transition-colors"
          >
            Zaregistruj se
          </a>
        </p>

      </div>
    </div>
  );
}
