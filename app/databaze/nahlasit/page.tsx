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

// Force per-request server rendering. Without this, Next 16 / Turbopack
// can attempt to pre-render the page at build time, which causes
// `supabase.auth.getUser()` to hang because cookies are unavailable.
// Symptom: production response is the loading.tsx shell forever
// instead of the actual page or a /login redirect.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nahlásit incident — Neklikni.cz',
  description:
    'Pomoz varovat ostatní — nahlas evidovaný obchodní incident do veřejné databáze.',
}

export default async function NahlasitPage() {
  let userId: string | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id ?? null
  } catch (err) {
    console.error('NahlasitPage auth check failed:', err)
    userId = null
  }

  if (!userId) {
    redirect('/login?redirect=/databaze/nahlasit')
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
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
    </main>
  )
}
