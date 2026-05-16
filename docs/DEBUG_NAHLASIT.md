# Debug: prázdná stránka /databaze/nahlasit

Repo state: commit `0fbe467` (latest on main). Local build je clean.
Produkční problém: `<main>` se renderuje s headerem, ale **`<IncidentReportForm />` část chybí**. Response 200 OK / 8.8 kB. Console clean. Network neukazuje JS error.

---

## page.tsx

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

**Auth check:** server-side `await supabase.auth.getUser()` na řádku 27. Pokud `user` je null → `redirect('/login?redirect=/databaze/nahlasit')` na řádku 30, který throwne a request se přesměruje.

**Žádný return null / fragment:** Jediný return je na řádku 33, vrací plné JSX (main → div.bg-blobs → div container → header + IncidentReportForm). **Žádná podmínka mezi headerem a IncidentReportForm — pokud header renderuje, IncidentReportForm by měl renderovat taky.**

---

## IncidentReportForm.tsx

```tsx
/**
 * IncidentReportForm — klientská komponenta formuláře nahlášení.
 *
 * KOSTRA — pro Prompt 6.
 * Vnitřek jednotlivých kroků se doplní v další iteraci (Pavlův návrat).
 *
 * Co kostra obsahuje:
 *   - useState pro currentStep (1-5)
 *   - 5 placeholder sekcí (každá s heading + TODO komentář)
 *   - Stepper indikátor nahoře
 *   - Tlačítka Zpět / Další / Odeslat (na step 5)
 *   - Glass-morphism kontejner v brand stylu
 *
 * Co kostra zatím NEMÁ:
 *   - Žádný state pro form data
 *   - Žádné validace
 *   - Žádné API volání
 *   - Žádný drag&drop
 */

'use client'

import { useState } from 'react'
import { Shield, AlertCircle, Upload, CheckCircle2 } from 'lucide-react'
import { Stepper } from './components/Stepper'

const TOTAL_STEPS = 5

const STEP_LABELS = ['Co se stalo?', 'O kom?', 'Detaily', 'Důkazy', 'Potvrzení']

export function IncidentReportForm() {
  const [currentStep, setCurrentStep] = useState<number>(1)

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  function goNext() {
    setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  function handleSubmit() {
    // TODO: real submit logic — POST multipart/form-data to /api/databaze/report
    // (Pavlův návrat: napojit form data state, validaci, file upload)
    console.warn('IncidentReportForm submit — not implemented yet (scaffold).')
  }

  return (
    <section className="surface-card-elevated animate-fade-up rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 backdrop-blur-md sm:p-8">
      <Stepper currentStep={currentStep} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />

      <div className="min-h-[280px]">
        {currentStep === 1 && <Step1Placeholder />}
        {currentStep === 2 && <Step2Placeholder />}
        {currentStep === 3 && <Step3Placeholder />}
        {currentStep === 4 && <Step4Placeholder />}
        {currentStep === 5 && <Step5Placeholder />}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={currentStep === 1}
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Zpět
        </button>

        {currentStep < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            className="brand-gradient rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)]"
          >
            Další
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="brand-gradient rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)]"
          >
            Odeslat nahlášení
          </button>
        )}
      </div>
    </section>
  )
}


// ── Placeholder kroky ────────────────────────────────
// Každý krok = heading + krátký popis + TODO komentář.
// V další iteraci sem přijde vlastní form UI.

function Step1Placeholder() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-purple-300">
        <Shield size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Co se stalo?</h2>
      </div>
      <p className="text-sm text-slate-400">
        Vyber kategorii incidentu, závažnost, datum a platformu.
      </p>
      {/* TODO: kategorie (IncidentCategory), severity (IncidentSeverity),
          incident_date (date input), platform (IncidentPlatform).
          + volitelné "platform_other" / "category_other" textová pole. */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
        Placeholder — formulářová pole se doplní v další iteraci.
      </div>
    </div>
  )
}


function Step2Placeholder() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-pink-300">
        <AlertCircle size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">O kom?</h2>
      </div>
      <p className="text-sm text-slate-400">
        Zadej identifikátory protistrany (telefon, číslo účtu, e-mail, FB
        profil, variabilní symbol). Identifikátory normalizuje a hashuje server.
      </p>
      {/* TODO: dynamický seznam identifikátorů — pro každý typ + value,
          možnost přidat/odebrat řádek. Min 1.
          Plus volitelné pole "Kontakt na dotčenou osobu (pokud znáte)". */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
        Placeholder — pole pro identifikátory se doplní v další iteraci.
      </div>
    </div>
  )
}


function Step3Placeholder() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-purple-300">
        <AlertCircle size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Detaily</h2>
      </div>
      <p className="text-sm text-slate-400">
        Stručně popiš, co se stalo. 50–1000 znaků. Faktický tón, žádná osobní
        obvinění (viz pokyny u textového pole).
      </p>
      {/* TODO: textarea pro description (50-1000 char counter),
          amount_czk number input (0 - 100 000 000). */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
        Placeholder — popis a částka se doplní v další iteraci.
      </div>
    </div>
  )
}


function Step4Placeholder() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300">
        <Upload size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Důkazy</h2>
      </div>
      <p className="text-sm text-slate-400">
        Nahraj 2–5 souborů (screenshoty, potvrzení o platbě, komunikace). Max 10
        MB na soubor. Povolené formáty: PNG, JPEG, WEBP, PDF.
      </p>
      {/* TODO: drag & drop oblast + fallback file input,
          preview seznam s možností odebrat,
          klient-side velikost/MIME check (zrcadlo backendu). */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
        Placeholder — upload zóna se doplní v další iteraci.
      </div>
    </div>
  )
}


function Step5Placeholder() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-emerald-300">
        <CheckCircle2 size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Potvrzení</h2>
      </div>
      <p className="text-sm text-slate-400">
        Souhrn nahlášení + tři konsenty (pravdivost údajů, GDPR, předání orgánům
        činným v trestním řízení).
      </p>
      {/* TODO: summary card s vyplněnými hodnotami,
          3 checkboxy: truth_confirmation, data_processing_consent,
          law_enforcement_consent. Submit teprve když všechny tři jsou true. */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
        Placeholder — souhrn a konsenty se doplní v další iteraci.
      </div>
    </div>
  )
}
```

**`'use client'`:** na řádku 21, **ale AFTER 20-řádkového JSDoc block komentu** (řádky 1–19) a prázdné řádky. Podle oficiálních Next.js docs jsou komentáře před `'use client'` direktivou povolené, ale historicky to v některých Turbopack buildech způsobovalo, že soubor byl interpretován jako server component.

**Vizuální obsah:** Vrací `<section className="surface-card-elevated ...">` s plným content (Stepper + krok placeholder + 2 tlačítka). **Žádný `return null` ani `<></>` v hot path.**

---

## Stepper.tsx

```tsx
/**
 * Stepper — vizuální indikátor kroků formuláře.
 *
 * Props:
 *   - currentStep: aktuální krok (1-based)
 *   - totalSteps: celkový počet kroků
 *   - labels: textový popis každého kroku (délka === totalSteps)
 *
 * Vizuál:
 *   - Aktivní krok má glow + brand gradient
 *   - Dokončené kroky mají Check ikonu
 *   - Budoucí kroky jsou ztlumené
 */

'use client'

import { Check } from 'lucide-react'

interface StepperProps {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export function Stepper({ currentStep, totalSteps, labels }: StepperProps) {
  return (
    <nav
      aria-label="Postup formuláře"
      className="mb-8 flex w-full items-start justify-between gap-1 sm:gap-2"
    >
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isDone = step < currentStep
        const label = labels[i] ?? `Krok ${step}`

        return (
          <div
            key={step}
            className="flex flex-1 flex-col items-center gap-2 text-center"
            aria-current={isActive ? 'step' : undefined}
          >
            <div
              className={[
                'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all sm:h-10 sm:w-10 sm:text-sm',
                isActive &&
                  'border-purple-400/60 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.7)] animate-pulse-soft',
                isDone &&
                  'border-purple-400/40 bg-purple-500/20 text-purple-200',
                !isActive && !isDone && 'border-slate-700 bg-slate-900/60 text-slate-500',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isDone ? <Check size={16} aria-hidden="true" /> : step}
            </div>
            <span
              className={[
                'text-[10px] font-medium leading-tight sm:text-xs',
                isActive ? 'text-slate-100' : 'text-slate-500',
              ].join(' ')}
            >
              {label}
            </span>
          </div>
        )
      })}
    </nav>
  )
}
```

Stejný pattern: `'use client'` na řádku 15, **po block komentu** (řádky 1–13). Vrací `<nav>` s mapováním přes pole `totalSteps` — bezpodmínečný visual output.

---

## Build status

```
✓ Compiled successfully in 3.1s
  Running TypeScript ...
  Finished TypeScript in 3.6s ...
✓ Generating static pages using 15 workers (26/26) in 345ms

ƒ /databaze/nahlasit   ← dynamic, in manifest
```

Lokální build je clean. Route `/databaze/nahlasit` je v build manifestu jako `ƒ` (dynamic, server-rendered).

---

## Mé hypotézy

Seřazeno od nejpravděpodobnější.

### H1 — Stale Vercel deployment (nejvíc pravděpodobné)
Latest commit `0fbe467` (feat: scaffold incident report form) možná **ještě nedoputoval na produkci**, nebo Vercel build selhal a serveruje starší artefakty. Header existoval i ve starší (in-flight) verzi, IncidentReportForm je čerstvý. Symptomy přesně odpovídají.

**Verifikace:**
- Otevři Vercel dashboard → Deployments
- Zkontroluj, zda nejnovější deployment má commit hash `0fbe467` (nebo `3b93d90` / starší)
- Pokud je tam starší commit → trigger redeploy / wait for build to finish
- View Function Logs, hledej build errors

### H2 — `'use client'` direktiva po block komentu
Oba klientské soubory (`IncidentReportForm.tsx` ř. 21, `Stepper.tsx` ř. 15) mají direktivu **po** JSDoc block komentu. Next.js docs říkají, že komenty před direktivou jsou OK, ale **Turbopack na Vercelu se historicky lišil od lokálního dev/build**.

Symptom by byl: soubor se interpretuje jako server component, `useState` při SSR vrátí default state, ale klient ho nehydratuje → "tichá" prázdná oblast bez JS chyby (pokud je hydration error swallowed).

**Verifikace:**
- Otevři Network tab → klikni na document → tab Response
- Hledej HTML pro `<section class="surface-card-elevated ...">` a `<nav aria-label="Postup formuláře">`
- Pokud HTML obsahuje stepper + section → problem je v hydration (CSS / Error Boundary)
- Pokud HTML neobsahuje stepper → server-side rendering vůbec neproběhl pro IncidentReportForm (bundler issue)

**Fix kdyby to bylo ono:** přesunout `'use client'` jako úplně první řádek souboru, JSDoc komentář pod direktivu.

### H3 — Error Boundary v app/layout.tsx tiše swallowuje runtime error
Z dřívějších session vím, že projekt používá `ErrorBoundary` (např. obalil `<HomeSections>` v homepage). Pokud root layout má `error.tsx` nebo error boundary, který při runtime erroru renderuje `null` místo error UI, vidí uživatel prázdné místo bez konzolových errorů.

**Verifikace:**
- Zkontroluj `app/layout.tsx` a `app/error.tsx`
- Pokud existuje custom error boundary, podívej se, zda nemá `console.log → null` pattern
- View Source na produkci, hledej tag `<section class="surface-card-elevated`

### H4 — CDN / Edge caching
Vercel Edge cache by mohl vracet starší HTML response. Route je `force-dynamic`? **Není** — `page.tsx` nemá `export const dynamic = 'force-dynamic'`. Server component s `auth.getUser()` by měl být per-request, ale Next.js mohl pre-renderovat fallback stav.

**Verifikace:**
- Otevři produkci s `?nocache=1` query string
- Nebo otevři v incognito (bez session cookie) → měl by tě poslat na /login, ne na prázdnou stránku

### H5 — Hydration mismatch swallowed
Server vykreslí HTML s `currentStep=1` → Step1Placeholder. Klient hydratuje a může mít jiný state. Pokud `useState` neběží (kvůli H2), hydration se nemůže dokončit a React 19 by mohl tiše remountovat → prázdná oblast.

**Verifikace:** stejná jako H2.

---

## Doporučený debug postup (po Pavlově review)

1. Zkontroluj Vercel deployment dashboard — který commit jede na produkci? (H1)
2. View source produkce: hledej HTML `<section class="surface-card-elevated">` (H2/H5)
3. Otevři Vercel Function Logs — žádný server-side throw v páge.tsx render path?
4. Pokud H2 potvrzeno: přesunout `'use client'` na první řádek obou souborů — minimální change, vysoká pravděpodobnost fixu.

Nedělám teď žádný fix. Čekám na Pavlovo rozhodnutí, kterou hypotézu prověřit první.
