"use client";
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

// Verze znění newsletter checkboxu níže. Posílá se přes emailRedirectTo
// a čte ji app/auth/callback/route.ts (ACCEPTED_NEWSLETTER_CONSENT_VERSIONS).
// Bump při jakékoli změně textu checkboxu.
const NEWSLETTER_CONSENT_VERSION = '2026-06';

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

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Validate next: relative path whose second char isn't "/" or "\" (blocks
  // open redirects like "//evil.com"). Query strings ("/pricing?plan=basic") ok.
  const redirectTo = searchParams.get('next') ?? searchParams.get('redirect');
  const safeRedirect = redirectTo && /^\/[^/\\]/.test(redirectTo) ? redirectTo : '/';
  const loginHref = safeRedirect !== '/' ? `/login?next=${encodeURIComponent(safeRedirect)}` : '/login';

  const handleGoogleRegister = async () => {
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
    // consent/consent_version se protáhnou potvrzovacím e-mailem až do
    // /auth/callback (stejně jako next) — checkbox tu uživatel viděl, takže
    // se mu newsletter onboarding modal po OAuth/magic-link už nezobrazí.
    const confirmUrl = new URL(`${location.origin}/auth/callback`);
    confirmUrl.searchParams.set('next', safeRedirect);
    confirmUrl.searchParams.set('consent', newsletterConsent ? '1' : '0');
    confirmUrl.searchParams.set('consent_version', NEWSLETTER_CONSENT_VERSION);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmUrl.toString() },
    });

    if (error) {
      setError(translateError(error.message));
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <CheckCircle2 className="w-20 h-20 text-success mb-6 animate-bounce" />
      <h1 className="text-3xl font-bold text-foreground mb-4">Zkontroluj e-mail!</h1>
      <p className="text-muted-foreground max-w-md">
        Poslali jsme ti potvrzovací odkaz na <span className="text-foreground font-bold">{email}</span>.
        Klikni na tlačítko v e-mailu a jsi rovnou přihlášen — heslo nemusíš zadávat znovu.
      </p>
      <p className="text-muted-foreground text-sm mt-4 max-w-md">
        Nedorazil? Zkontroluj složku <span className="text-foreground">Spam / Hromadné</span>.
      </p>
      <button onClick={() => router.push(loginHref)} className="mt-8 text-primary hover:text-primary/80 text-sm font-bold transition-colors">
        Zpět na přihlášení
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md surface-card p-8 rounded-3xl">
        <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Registrace</h1>
        <p className="text-muted-foreground mb-6 text-center">Vytvoř si účet a získej 5 analýz zdarma navíc.</p>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleRegister}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3.5 px-4 rounded-xl border border-gray-200 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-5"
        >
          <GoogleIcon />
          {googleLoading ? 'Přesměrovávám…' : 'Pokračovat přes Google'}
        </button>

        {/* Oddělovač */}
        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-3 text-xs text-muted-foreground uppercase tracking-widest">nebo</span>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="karel@novak.cz"
              className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-colors"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Heslo (min. 6 znaků)"
              className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-colors"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-4 text-muted-foreground" size={20} />
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Zopakuj heslo"
              className="w-full bg-card border border-border rounded-xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none transition-colors"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newsletterConsent}
              onChange={(e) => setNewsletterConsent(e.target.checked)}
              disabled={loading}
              className="mt-0.5 w-4 h-4 shrink-0 rounded border-border bg-card text-primary accent-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0 cursor-pointer"
            />
            <span>
              Chci dostávat občasné tipy a upozornění na nové podvody e-mailem. Odhlásit se můžu kdykoli.{" "}
              <a
                href="/gdpr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 underline underline-offset-2"
              >
                Zásady ochrany osobních údajů
              </a>
              .
            </span>
          </label>

          {error && <p className="text-destructive text-sm font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading || googleLoading || !email || !password || !passwordConfirm}
            className="w-full bg-primary hover:brightness-110 text-primary-foreground font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
          >
            {loading ? "Registruji..." : <>Vytvořit účet <ArrowRight size={20} /></>}
          </button>
        </form>

        <p className="text-muted-foreground text-sm mt-6 text-center">
          Už máš účet?{" "}
          <a href={loginHref} className="text-primary hover:text-primary/80 font-bold transition-colors">
            Přihlásit se
          </a>
        </p>
      </div>
    </div>
  );
}
