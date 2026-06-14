/**
 * /databaze — Landing page modulu databáze nahlášených incidentů.
 *
 * Server component, public (žádný auth check).
 *
 * Obsahuje:
 *   - Hero + brand search formulář (native GET → /databaze/hledat)
 *   - Trust řádek (ručně ověřujeme, důkazy, právo reakce)
 *   - Sekce "Jak to funguje"
 *   - 3 CTA karty (nahlásit, vyhledat, claim)
 *   - Právní disclaimer
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertCircle,
  CreditCard,
  Facebook,
  FileCheck,
  Globe,
  Hash,
  HelpCircle,
  Mail,
  Phone,
  Plus,
  Scale,
  Search as SearchIcon,
  Shield,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import PageHero from '../components/PageHero'
import { getRecentPublishedIncidents, type RecentIncidentCard } from './_lib/recentIncidents'
import { CATEGORY_LABELS, type IdentifierType } from '@/types/databaze'
import { identifierLabel } from '@/utils/databaze/identifiers'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Databáze nahlášených incidentů — Neklikni.cz',
  description:
    'Veřejná databáze nahlášených obchodních incidentů. Ověř protistranu před transakcí — vlož telefon, e-mail nebo číslo účtu.',
}


const TYPE_ICON: Record<IdentifierType, LucideIcon> = {
  phone: Phone,
  account: CreditCard,
  email: Mail,
  facebook_url: Facebook,
  website: Globe,
  var_symbol: Hash,
  other: HelpCircle,
}


function formatCzechDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}


// ── Page ─────────────────────────────────────────────

export default async function DatabazePage() {
  const recentIncidents = await getRecentPublishedIncidents(15)

  return (
    <main className="min-h-screen">
      <PageHero
        tag="Databáze incidentů"
        title="Ověř protistranu"
        highlight="před transakcí"
        description="Veřejná databáze nahlášených obchodních incidentů. Vlož telefon, e-mail nebo číslo účtu a zjisti, zda byl subjekt nahlášen."
      />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        {/* ── Nahlásit incident (primární akce stránky) ── */}
        <Link
          href="/databaze/nahlasit"
          className="group mb-4 flex items-center justify-between gap-4 rounded-xl border border-primary/40 bg-primary/5 p-4 transition hover:border-primary hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition group-hover:scale-105">
              <Plus size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Nahlásit incident</p>
              <p className="text-sm text-muted-foreground">Máte zkušenost s podvodem? Sdílejte ji a ochraňte ostatní.</p>
            </div>
          </div>
          <span className="hidden shrink-0 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition group-hover:bg-primary group-hover:text-primary-foreground sm:inline-flex">
            Nahlásit
          </span>
        </Link>

        {/* ── Search form (native GET) ───────────── */}
        <form
          action="/databaze/hledat"
          method="get"
          className="mb-10 flex flex-col sm:flex-row rounded-xl border border-border bg-card overflow-hidden transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
        >
          <label htmlFor="q" className="sr-only">
            Identifikátor k vyhledání
          </label>
          <input
            id="q"
            name="q"
            type="search"
            required
            placeholder="Telefon, e-mail, číslo účtu…"
            className="flex-1 border-0 bg-transparent p-4 text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 border-t border-border bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition hover:brightness-110 sm:border-t-0 sm:border-l sm:px-8"
          >
            <SearchIcon size={18} aria-hidden="true" />
            Ověřit
          </button>
        </form>

        {/* ── Trust řádek ─────────────────────────── */}
        <ul className="mb-12 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-success shrink-0" aria-hidden="true" />
            Každé nahlášení ručně ověřujeme
          </li>
          <li className="inline-flex items-center gap-1.5">
            <FileCheck size={14} className="text-success shrink-0" aria-hidden="true" />
            Záznamy s důkazy
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Scale size={14} className="text-success shrink-0" aria-hidden="true" />
            Dotčená osoba má právo reakce
          </li>
        </ul>

        {/* ── Jak to funguje ─────────────────────── */}
        <section className="mb-12">
          <h2 className="mb-6 text-center text-2xl font-bold text-foreground">
            Jak to funguje
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <HowItWorksStep
              number={1}
              icon={<Plus size={20} aria-hidden="true" />}
              title="Nahlásit"
              text="Sdílej zkušenost. Projde AI předkontrolou a dotčená osoba dostane 14 dní na vyjádření."
            />
            <HowItWorksStep
              number={2}
              icon={<SearchIcon size={20} aria-hidden="true" />}
              title="Ověřit"
              text="Vlož identifikátor. Najdeš záznam, nebo dostaneš doporučení, jak ověřit jinak."
            />
            <HowItWorksStep
              number={3}
              icon={<Shield size={20} aria-hidden="true" />}
              title="Reagovat"
              text="Pokud jsi nahlášený, máš právo se vyjádřit. Tvoje verze bude veřejně viditelná."
            />
          </div>
        </section>

        {/* ── Naposledy nahlášené případy ──────────── */}
        {recentIncidents.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
              Naposledy nahlášené případy
            </h2>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Záznamy od uživatelů, zveřejněné po AI předkontrole a uplynutí lhůty pro vyjádření.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recentIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </section>
        )}

        {/* ── CTA cards ──────────────────────────── */}
        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CtaCard
            href="/databaze/hledat"
            icon={<SearchIcon size={24} aria-hidden="true" />}
            title="Vyhledat subjekt"
            description="Ověř identifikátor v databázi"
          />
          <CtaCard
            href="/databaze/claim"
            icon={<Shield size={24} aria-hidden="true" />}
            title="Toto je o mně"
            description="Reaguj na záznam, který je o tobě"
          />
        </section>

        {/* ── Disclaimer ─────────────────────────── */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={16}
              className="mt-0.5 flex-shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
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

interface HowItWorksStepProps {
  number: number
  icon: React.ReactNode
  title: string
  text: string
}

function HowItWorksStep({
  number,
  icon,
  title,
  text,
}: HowItWorksStepProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary text-primary">
          {icon}
        </span>
        <div>
          <p className="text-xs text-muted-foreground">Krok {number}</p>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  )
}


function IncidentCard({ incident }: { incident: RecentIncidentCard }) {
  const Icon = TYPE_ICON[incident.identifierType]
  const categoryLabel =
    incident.category === 'other' && incident.categoryOther
      ? incident.categoryOther
      : CATEGORY_LABELS[incident.category]

  return (
    <Link
      href={`/databaze/pripad/${incident.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/50 hover:bg-secondary/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <Icon size={12} aria-hidden="true" />
          {identifierLabel(incident.identifierType, incident.identifierMasked)}
        </span>
        <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
          Nahlášeno uživateli
        </span>
      </div>

      <p className="font-mono text-sm text-foreground">{incident.identifierMasked}</p>

      <p className="text-sm font-semibold text-foreground">{categoryLabel}</p>

      <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCzechDate(incident.publicAt)}</span>
        <span>
          {incident.subjectIncidentCount}{' '}
          {incident.subjectIncidentCount === 1 ? 'nahlášení' : 'nahlášení celkem'}
        </span>
      </div>
    </Link>
  )
}


interface CtaCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  emphasize?: boolean
}

function CtaCard({ href, icon, title, description, emphasize }: CtaCardProps) {
  const wrapperClass = emphasize
    ? 'group flex flex-col gap-2 rounded-xl border border-primary bg-primary p-5 transition hover:scale-[1.01]'
    : 'group surface-card-elevated flex flex-col gap-2 rounded-xl border border-border bg-card p-5 transition hover:border-primary/50 hover:bg-secondary/40'

  const iconWrapperClass = emphasize
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground transition group-hover:scale-105'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary transition group-hover:scale-105'

  const titleClass = emphasize
    ? 'text-base font-bold text-primary-foreground'
    : 'text-base font-semibold text-foreground'

  const descClass = emphasize
    ? 'text-sm text-primary-foreground/85'
    : 'text-sm text-muted-foreground'

  return (
    <Link href={href} className={wrapperClass}>
      <span className={iconWrapperClass}>{icon}</span>
      <h3 className={titleClass}>{title}</h3>
      <p className={descClass}>{description}</p>
    </Link>
  )
}
