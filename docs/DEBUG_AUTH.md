# Debug: auth flow

Repo state: commit `71a5bc1` (po move 'use client' fixu).

Symptom 1: po loginu z `/login?redirect=/databaze/nahlasit` user skončí na homepage místo cílového URL.
Symptom 2: přihlášený user na `/databaze/nahlasit` vidí header + prázdný main, žádný formulář.

Sourozenecké informace:
- `app/databaze/` neobsahuje `layout.tsx` (jen root `app/layout.tsx`).
- Žádný `export const dynamic` v `nahlasit/*` ani v `login/page.tsx`.
- `app/login/` obsahuje jen `page.tsx` a `layout.tsx`, žádný `LoginForm.tsx`.

---

## 1. app/login/page.tsx

```tsx
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
}```

---

## 2. app/auth/callback/route.ts

```tsx
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  // Validate next: must be a relative path starting with "/" and no double slashes or protocol
  const rawNext = searchParams.get('next') ?? '/'
  const next = /^\/[^/\\]/.test(rawNext) || rawNext === '/' ? rawNext : '/'

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  async function tryApplyReferral() {
    const refCookie = cookieStore.get('neklikni_ref')
    if (!refCookie?.value) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabaseAdmin.rpc('apply_referral', {
      p_new_user_id: user.id,
      p_ref_code: refCookie.value,
    })
    if (error) console.warn('apply_referral failed:', error.message)
    cookieStore.delete('neklikni_ref')
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await tryApplyReferral()
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    if (!error) {
      if (type === 'signup') await tryApplyReferral()
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Prihlaseni_selhalo`)
}
```

---

## 3. middleware.ts (root)

```tsx
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Referral codes are exactly 8 uppercase alphanumeric characters
const REF_CODE_RE = /^[A-Z0-9]{8}$/

export async function middleware(request: NextRequest) {
  const protectedPaths = ['/profile', '/billing']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!isProtectedPath) {
    const res = NextResponse.next()
    // Store referral code in HTTP-only cookie for 30 days (only if not already set)
    const refCode = request.nextUrl.searchParams.get('ref')
    if (refCode && REF_CODE_RE.test(refCode) && !request.cookies.get('neklikni_ref')) {
      res.cookies.set('neklikni_ref', refCode, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
    }
    return res
  }

  // Protected path — validate session and forward refreshed cookies
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

---

## 4a. utils/supabase/server.ts

```tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies nelze nastavit, ignorujeme
            // Middleware se o refresh postará
          }
        },
      },
    }
  )
}```

## 4b. utils/supabase/client.ts

```tsx
﻿import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## 5. app/databaze/nahlasit/page.tsx (kontext)

```tsx
/**
 * /databaze/nahlasit — Nahlásit incident
 *
 * Server component:
 * - Vyžaduje přihlášení (redirect na /login s návratovým query param).
 * - Renderuje klientskou komponentu IncidentReportForm.
 *
 * Kostra pro Prompt 6 — vnitřek formuláře doplní pozdější iterace.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Shield } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { IncidentReportForm } from './IncidentReportForm'

export const metadata: Metadata = {
  title: 'Nahlásit incident — Neklikni.cz',
  description:
    'Pomoz varovat ostatní — nahlas evidovaný obchodní incident do veřejné databáze.',
}

export default async function NahlasitPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/databaze/nahlasit')
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="bg-blobs">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <header className="mb-8 animate-fade-up text-center">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/5 px-4 py-1.5 text-xs font-medium text-purple-300">
              <Shield size={14} aria-hidden="true" />
              <span>Bezpečné nahlášení</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="brand-gradient-text">Nahlásit incident</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400 sm:text-base">
              Sdílej zkušenost s ostatními. Tvoje nahlášení projde AI předkontrolou
              a dotčená osoba bude mít 14 dní na vyjádření.
            </p>
          </header>

          <IncidentReportForm />
        </div>
      </div>
    </main>
  )
}
```

---

## Pozorování

### A) Login handler vs `?redirect=` query parametr

Login handler **ignoruje `?redirect=` query param**. Konkrétní místa:

- **Password mode** (`app/login/page.tsx:29`):
  ```ts
  window.location.href = '/'
  ```
  Hardcoded redirect na homepage. Nikde se nečte `?redirect=` ani `?next=` ze současného URL.

- **Magic link mode** (`app/login/page.tsx:34`):
  ```ts
  emailRedirectTo: `${location.origin}/auth/callback`
  ```
  Také ignoruje `?redirect=`. Callback URL neobsahuje `?next=`, takže...

- **Auth callback** (`app/auth/callback/route.ts:17-18`):
  ```ts
  const rawNext = searchParams.get('next') ?? '/'
  ```
  Čte `?next=` a redirectne tam, ale login ho **nikdy nepošle**, takže `next` je vždy `/`.

**Conclusion pro Symptom 1:** kód redirect chain *nikdy* nepřečte query param z `/login?redirect=...`. To je root cause. Page `/databaze/nahlasit` (a kdokoli další) volá `redirect('/login?redirect=...')`, ale login handler ten param tiše zahodí a po loginu jde vždy na `/`.

### B) Middleware vs `/databaze/nahlasit`

Middleware **nedělá auth check pro `/databaze/nahlasit`**. Konkrétně:

- `middleware.ts:8` — `const protectedPaths = ['/profile', '/billing']`
- Path `/databaze/nahlasit` nezačíná ani `/profile` ani `/billing` → `isProtectedPath` je `false`
- `middleware.ts:13-27` — vrátí brzy `NextResponse.next()` s ošetřením `ref` cookie, bez Supabase auth volání.

Důsledek: middleware **neaktualizuje session cookies pro `/databaze/nahlasit`**. Token refresh se pro tuto route nikdy nedostane do `setAll` zpětně přes middleware-response.

### C) Server-side cookie refresh tichý fail

`utils/supabase/server.ts:15-23` má `setAll` obalený v try/catch, který v server-component kontextu **silently ignoruje failure**:

```ts
setAll(cookiesToSet) {
  try {
    cookiesToSet.forEach(...)
  } catch {
    // Server Component — cookies nelze nastavit, ignorujeme
    // Middleware se o refresh postará
  }
}
```

Komentář říká "middleware se postará", ale **pro `/databaze/nahlasit` middleware právě nedělá nic** (viz B). Pokud Supabase session potřebuje refresh při getUser(), může to spadnout do silent fail větve a vrátit user=null pro reálně přihlášený session.

### D) Existuje konflikt mezi middleware auth a page.tsx auth?

**Přímý konflikt ne** (každý zacházek řeší jiné path), ale **mezera** ano:

- Middleware: dělá auth + refresh jen pro `/profile`, `/billing`
- `page.tsx` v `/databaze/nahlasit`: dělá auth-check, ale spoléhá na čerstvou session
- Žádná vrstva neudělá session refresh pro `/databaze/nahlasit` — page.tsx musí věřit tomu, co je v cookies

**Praktický důsledek pro Symptom 2:** Pokud má user expirovanou access token, ale platný refresh token, `auth.getUser()` v page.tsx může:
- Vrátit `null` → `redirect()` → user vidí redirect na `/login` (NE prázdný main)
- NEBO úspěšně provést refresh, ale `setAll` ve server.ts to silent-ignoruje → další request opět expired

Ani jedno nevysvětluje prázdný main BEZ redirectu, BEZ formuláře a BEZ console errorů. Symptom 2 tedy **pravděpodobně NENÍ čistě auth issue** — auth check by skončil buď fullrender nebo redirectem, nikdy "header + prázdný main".

### E) Alternativní hypotézy pro Symptom 2

Vrátím se zpět k debug dumpu z `docs/DEBUG_NAHLASIT.md` — H2 (`'use client'` placement) byla addressed v commitu `71a5bc1`. Pokud Symptom 2 přetrvává:

1. **Vercel deploy ještě neproběhl** pro commit `71a5bc1`. Verify v dashboardu.
2. **CDN cache** stará HTML — viz H4. Page.tsx nemá `export const dynamic = 'force-dynamic'`.
3. **Error Boundary v `app/layout.tsx`** tiše swallowuje runtime error v IncidentReportForm. Tohle jsem zatím neověřoval — `app/layout.tsx` jsem v této diagnostice neotevřel. Doporučuju zkontrolovat existenci `error.tsx` v `app/databaze/` nebo root error handlingu v layout.

### F) Doporučené (po Pavlově review)

Pro Symptom 1 (potvrzeno, jednoznačný bug):
- Login handler musí číst `?redirect=` z `useSearchParams()` a po úspěšném signInu redirectovat tam místo na `/`
- Magic link `emailRedirectTo` musí předat `?next=${redirect}`, callback to už umí

Pro Symptom 2 (nejistá příčina):
- Verify Vercel deployment je na commit `71a5bc1`
- View source na produkci → hledej `<section class="surface-card-elevated`
- Pokud chybí: zkontroluj `app/layout.tsx` + případné `error.tsx`

Nedělám fix. Reportuju.
