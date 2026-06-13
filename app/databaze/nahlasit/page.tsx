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
import { createClient } from '@/utils/supabase/server'
import { IncidentReportForm } from './IncidentReportForm'
import PageHero from '@/app/components/PageHero'

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
  robots: { index: false, follow: false },
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
    <main className="min-h-screen">
      <PageHero
        tag="Bezpečné nahlášení"
        title="Nahlásit"
        highlight="incident"
        description="Sdílej zkušenost s ostatními. Tvoje nahlášení projde AI předkontrolou a dotčená osoba bude mít 14 dní na vyjádření."
      />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <IncidentReportForm />
      </div>
    </main>
  )
}
