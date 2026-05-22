/**
 * /databaze — Landing page modulu databáze nahlášených incidentů.
 *
 * Server component, public (žádný auth check).
 *
 * Obsahuje:
 *   - Hero + brand search formulář (native GET → /databaze/hledat)
 *   - Stats counters (subjects, incidents, reporters) — server-side fetch
 *   - Sekce "Jak to funguje"
 *   - 3 CTA karty (nahlásit, vyhledat, claim)
 *   - Právní disclaimer
 *
 * Stats fetch má defensive null-fallback — pokud env vars chybí nebo
 * tabulky ještě nejsou v DB, zobrazí se "—" místo crashe.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  AlertCircle,
  Database,
  Plus,
  Search as SearchIcon,
  Shield,
} from 'lucide-react'
import type { IncidentStatus } from '@/types/databaze'
import type { DatabazeDatabase } from '../api/databaze/_lib/database'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Databáze nahlášených incidentů — Neklikni.cz',
  description:
    'Veřejná databáze nahlášených obchodních incidentů. Ověř protistranu před transakcí — vlož telefon, e-mail nebo číslo účtu.',
}


// ── Stats fetcher ────────────────────────────────────

const PUBLIC_STATUSES: IncidentStatus[] = ['published', 'notified', 'ai_reviewed']

interface Stats {
  subjects: number | null
  incidents: number | null
  reporters: number | null
}

async function fetchStats(): Promise<Stats> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Stats: Supabase admin env vars missing')
    return { subjects: null, incidents: null, reporters: null }
  }

  try {
    const sb = createClient<DatabazeDatabase>(url, key)
    const [subjectsRes, incidentsRes, reportersRes] = await Promise.all([
      sb
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('visibility_status', 'active'),
      sb
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .in('status', PUBLIC_STATUSES),
      sb.from('reporters').select('*', { count: 'exact', head: true }),
    ])

    return {
      subjects: subjectsRes.error ? null : subjectsRes.count ?? 0,
      incidents: incidentsRes.error ? null : incidentsRes.count ?? 0,
      reporters: reportersRes.error ? null : reportersRes.count ?? 0,
    }
  } catch (err) {
    console.error('Stats fetch exception:', err)
    return { subjects: null, incidents: null, reporters: null }
  }
}


function formatCount(n: number | null): string {
  if (n === null || n === 0) return '—'
  return n.toLocaleString('cs-CZ')
}


// ── Page ─────────────────────────────────────────────

export default async function DatabazePage() {
  const stats = await fetchStats()

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        {/* ── Hero ────────────────────────────────── */}
        <header className="mb-8 animate-fade-up text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/5 px-4 py-1.5 text-xs font-medium text-purple-300">
            <Database size={14} aria-hidden="true" />
            <span>Databáze incidentů</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="brand-gradient-text">Ověř protistranu před transakcí</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
            Veřejná databáze nahlášených obchodních incidentů. Vlož telefon,
            e-mail nebo číslo účtu a zjisti, zda byl subjekt nahlášen.
          </p>
        </header>

        {/* ── Search form (native GET) ───────────── */}
        <form
          action="/databaze/hledat"
          method="get"
          className="mb-10 flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="q" className="sr-only">
            Identifikátor k vyhledání
          </label>
          <input
            id="q"
            name="q"
            type="search"
            required
            placeholder="+420 ... | email@... | 12345/0100 | facebook.com/..."
            className="surface-card-elevated flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-base font-medium text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
          <button
            type="submit"
            className="brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)] sm:px-8"
          >
            <SearchIcon size={18} aria-hidden="true" />
            Ověřit
          </button>
        </form>

        {/* ── Stats ───────────────────────────────── */}
        <section className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatsCard
            label="Subjektů v databázi"
            value={formatCount(stats.subjects)}
          />
          <StatsCard
            label="Nahlášených incidentů"
            value={formatCount(stats.incidents)}
          />
          <StatsCard
            label="Aktivních nahlašovatelů"
            value={formatCount(stats.reporters)}
          />
        </section>

        {/* ── Jak to funguje ─────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-6 text-center text-2xl font-bold text-slate-100">
            Jak to funguje
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <HowItWorksStep
              number={1}
              icon={<Plus size={20} aria-hidden="true" />}
              iconColor="text-purple-300"
              borderColor="border-purple-500/30"
              title="Nahlásit"
              text="Sdílej zkušenost. Projde AI předkontrolou a dotčená osoba dostane 14 dní na vyjádření."
            />
            <HowItWorksStep
              number={2}
              icon={<SearchIcon size={20} aria-hidden="true" />}
              iconColor="text-cyan-300"
              borderColor="border-cyan-500/30"
              title="Ověřit"
              text="Vlož identifikátor. Najdeš záznam, nebo dostaneš doporučení, jak ověřit jinak."
            />
            <HowItWorksStep
              number={3}
              icon={<Shield size={20} aria-hidden="true" />}
              iconColor="text-emerald-300"
              borderColor="border-emerald-500/30"
              title="Reagovat"
              text="Pokud jsi nahlášený, máš právo se vyjádřit. Tvoje verze bude veřejně viditelná."
            />
          </div>
        </section>

        {/* ── CTA cards ──────────────────────────── */}
        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CtaCard
            href="/databaze/nahlasit"
            icon={<Plus size={24} aria-hidden="true" />}
            iconColor="text-white"
            title="Nahlásit incident"
            description="Sdílej zkušenost s ostatními"
            emphasize
          />
          <CtaCard
            href="/databaze/hledat"
            icon={<SearchIcon size={24} aria-hidden="true" />}
            iconColor="text-cyan-300"
            title="Vyhledat subjekt"
            description="Ověř identifikátor v databázi"
          />
          <CtaCard
            href="/databaze/claim"
            icon={<Shield size={24} aria-hidden="true" />}
            iconColor="text-emerald-300"
            title="Toto je o mně"
            description="Reaguj na záznam, který je o tobě"
          />
        </section>

        {/* ── Disclaimer ─────────────────────────── */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={16}
              className="mt-0.5 flex-shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-slate-500">
              Údaje pocházejí od uživatelů a procházejí AI předkontrolou.
              Subjekty nebyly posouzeny soudem ani jiným orgánem jako
              protiprávní. Dotčené osoby mají právo se k záznamům vyjádřit
              (§ 184 trestního zákoníku, GDPR článek 15).
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}


// ── Subcomponents ───────────────────────────────────

function StatsCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card-elevated rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-center">
      <p className="text-3xl font-bold brand-gradient-text">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  )
}


interface HowItWorksStepProps {
  number: number
  icon: React.ReactNode
  iconColor: string
  borderColor: string
  title: string
  text: string
}

function HowItWorksStep({
  number,
  icon,
  iconColor,
  borderColor,
  title,
  text,
}: HowItWorksStepProps) {
  return (
    <div className={`rounded-xl border ${borderColor} bg-slate-900/40 p-5`}>
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full border ${borderColor} bg-slate-950/60 ${iconColor}`}>
          {icon}
        </span>
        <div>
          <p className="text-xs text-slate-500">Krok {number}</p>
          <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{text}</p>
    </div>
  )
}


interface CtaCardProps {
  href: string
  icon: React.ReactNode
  iconColor: string
  title: string
  description: string
  emphasize?: boolean
}

function CtaCard({ href, icon, iconColor, title, description, emphasize }: CtaCardProps) {
  const wrapperClass = emphasize
    ? 'group brand-gradient pulse-glow flex flex-col gap-2 rounded-xl border border-purple-400/40 p-5 transition hover:scale-[1.01]'
    : 'group surface-card-elevated flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5 transition hover:border-purple-500/50 hover:bg-slate-900/60'

  const iconWrapperClass = emphasize
    ? `inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ${iconColor} transition group-hover:scale-105`
    : `inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950/60 ${iconColor} transition group-hover:scale-105`

  const titleClass = emphasize
    ? 'text-base font-bold text-white'
    : 'text-base font-semibold text-slate-100'

  const descClass = emphasize
    ? 'text-sm text-white/85'
    : 'text-sm text-slate-400'

  return (
    <Link href={href} className={wrapperClass}>
      <span className={iconWrapperClass}>{icon}</span>
      <h3 className={titleClass}>{title}</h3>
      <p className={descClass}>{description}</p>
    </Link>
  )
}
