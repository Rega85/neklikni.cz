# Debug: produkční HTML + layout + error handlers

Repo state: commit `e84d420` (po dvou diagnostických dumpech).
Produkce: `https://www.neklikni.cz`.

---

## 1. Produkční HTML response

### Fetch metadata

```
curl -sL -A "Mozilla/5.0" https://www.neklikni.cz/databaze/nahlasit
→ HTTP 200 OK | Size: 29 251 B | Final URL: bez redirectu
```

**Bez session cookies** (anonymní request). Per page.tsx logice by tohle mělo skončit redirectem na `/login?redirect=...`. **Místo toho server vrátil 200 s plným HTML.**

### Klíčové matchers

| Selector | Výskyt | Kontext |
|---|---:|---|
| `<title>Nahlásit incident — Neklikni.cz</title>` | 1 | metadata z page.tsx |
| `<main aria-busy="true" aria-live="polite">` | 1 | **loading.tsx**, NE page.tsx |
| `Načítám` | 2 | loading.tsx text + duplicate (možná React stream) |
| `surface-card-elevated` | **0** | IncidentReportForm CHYBÍ |
| `Postup formuláře` | **0** | Stepper nav CHYBÍ |
| `Co se stalo` | **0** | Step1Placeholder CHYBÍ |
| `Krok 1 \| Krok 2` | **0** | žádné step indikátory |

### Head sample

```html
<title>Nahlásit incident — Neklikni.cz</title>
<link rel="stylesheet" href="/_next/static/chunks/0xb_rwc5~49tl.css" data-precedence="next"/>
<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/12qoks_dmsex~.js"/>
```

### Main sample

```html
<main class="min-h-screen bg-[#020617] text-slate-100" aria-busy="true" aria-live="polite">
```

### Analýza

- **Obsahuje surface-card-elevated:** ❌ NE
- **Obsahuje `<nav aria-label="Postup formuláře">`:** ❌ NE
- **Obsahuje "Co se stalo?":** ❌ NE
- **`<main>` obsah:** atributy `aria-busy="true" aria-live="polite"` — to je `loading.tsx`, ne page.tsx

**Klíčový postřeh:** Produkce vrací **loading.tsx shell** místo skutečného obsahu page.tsx. Metadata je z page.tsx (title), takže page.tsx je _částečně_ inicializován, ale **render se nikdy nedostane za `await auth.getUser()`** — buď to hangs, nebo throws bez správného handlingu, a Suspense ukazuje loading fallback navždy.

Pro **anonymní request** (bez session) se MUSÍ stát `redirect('/login?...')` → 307. To se NEděje. Místo toho 200 s loading shell.

**To je root cause Symptomu 2**:
- Server-side render page.tsx hangs/fails
- Suspense vrací loading.tsx
- Header (z `app/layout.tsx`) renderuje normálně
- Uživatel vidí "header + prázdný main" (kde `<main>` je loading shell s drobným spinnerem, který nemusí být viditelný)

**Možné příčiny page.tsx failu na produkci:**
1. Chybí Vercel env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — `process.env.X!` non-null assertion ztichne TS error, ale runtime `createServerClient(undefined, undefined)` může hangnout/throwovat
2. Supabase API rate-limit nebo síťový problém z Vercel IP
3. Server-side rendering bug v Next 16.2.4 / Turbopack pro tuhle specifickou kombinaci

---

## 2. app/layout.tsx

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieConsent from "./components/CookieConsent";
import GaScript from "./components/GaScript";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const viewport: Viewport = {
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: "NeKlikni.cz | AI bodyguard pro tvůj klidný internet",
  description: "Prověřte si podezřelou zprávu, SMS nebo odkaz dřív, než na něj kliknete. AI analýza phishingu s modelem Sonnet 3.5.",
  metadataBase: new URL('https://www.neklikni.cz'),
  manifest: "/manifest.json",
  openGraph: {
    title: "NeKlikni.cz | AI bodyguard",
    description: "Analýza podvodných zpráv v reálném čase. Chraňte své peníze i data.",
    siteName: 'NeKlikni.cz',
    locale: 'cs_CZ',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NeKlikni.cz Analysis Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeKlikni.cz | AI bodyguard',
    description: 'Prověřte si podezřelou zprávu dřív, než na ni kliknete.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: "https://neklikni.cz",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: "NeKlikni",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="cs" className="selection:bg-purple-500/30">
      <body className={`${inter.className} bg-slate-950 text-white antialiased`}>
        <div className="bg-blobs" aria-hidden="true" />
        <GaScript />
        <Header />
        {children}
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}```

**Pozorování layoutu:**
- Žádný ErrorBoundary, žádné Suspense wrapping
- `<Header />` se vždy renderuje (vysvětluje "header funguje" v reportu)
- `{children}` se renderuje přímo bez wrapperu
- Žádný runtime swallow, který by skryl IncidentReportForm

**Conclusion:** layout.tsx není problém. Header se renderuje vždy. Mezi Headerem a Footerem se _mělo_ renderovat page.tsx return, ale na produkci tam je jen loading.tsx shell.

---

## 3. Error handlers

### app/error.tsx — EXISTS

```tsx
"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
      <h1 className="text-3xl font-black text-white mb-3 tracking-tighter">
        Něco se pokazilo
      </h1>
      <p className="text-slate-400 mb-8 max-w-sm leading-relaxed">
        Omlouváme se za potíže. Zkuste stránku obnovit nebo se vraťte na hlavní stránku.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          onClick={reset}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
        >
          Zkusit znovu
        </button>
        <Link
          href="/"
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
        >
          Zpět na hlavní stránku
        </Link>
      </div>
    </div>
  );
}
```

**Komentář:** Standardní error boundary s reset + home link. Pokud by page.tsx throwla, **měla by se zobrazit ta UI** (`<AlertTriangle> Něco se pokazilo`). To se ale NEděje — místo toho loading shell. Takže page.tsx **netthrowne**, jen visí.

### app/global-error.tsx — MISSING

Neexistuje.

### app/databaze/error.tsx — MISSING

Neexistuje.

### app/databaze/nahlasit/error.tsx — MISSING

Neexistuje.

---

## Synthesis (žádný fix, jen diagnostika)

**Symptom 2 root cause: page.tsx server-side render hangs.**

Důkazy:
1. Produkce vrací 200 OK s loading.tsx shell, ne redirect (jak by mělo pro anonymní user)
2. HTML obsahuje title metadata z page.tsx, ale žádný visible content z page.tsx return body
3. `app/error.tsx` existuje, ale neuplatňuje se — takže page.tsx netthrowne, jen visí v `await`
4. Layout.tsx vykresluje Header normálně (i bez page.tsx execution)

**Nejpravděpodobnější příčina:** `await supabase.auth.getUser()` v page.tsx visí kvůli chybějícím/špatným env vars na Vercelu, nebo síťovému problému s Supabase.

**Doporučení pro fix (po Pavlově review):**

1. **Verify Vercel env vars** — `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` MUSÍ být nastavené v Production environment. Pokud chybí, page.tsx hangs.
2. **Vercel Function Logs** — otevři produkční dashboard → Functions → hledej errors z `/databaze/nahlasit` v posledních 24h. Hangnutý request bývá zaznamenán jako timeout.
3. **Try-catch v page.tsx** — obal `await supabase.auth.getUser()` v try/catch a v catch větvi `redirect('/login?redirect=/databaze/nahlasit')`. Pokud env vars vážně chybí, alespoň user dostane redirect místo loading-forever.
4. **`export const dynamic = 'force-dynamic'`** — explicitní pro page.tsx, ať Next.js nepokouší pre-render.

Symptom 1 (login ignoruje `?redirect=`) — root cause potvrzeno v předchozím dumpu `docs/DEBUG_AUTH.md`. Nezávislý bug.

Nedělám fix. Reportuju.
