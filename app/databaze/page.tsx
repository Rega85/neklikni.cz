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
  FileCheck,
  Plus,
  Scale,
  Search as SearchIcon,
  Shield,
  ShieldCheck,
} from 'lucide-react'
import PageHero from '../components/PageHero'

export const metadata: Metadata = {
  title: 'Databáze nahlášených incidentů — Neklikni.cz',
  description:
    'Veřejná databáze nahlášených obchodních incidentů. Ověř protistranu před transakcí — vlož telefon, e-mail nebo číslo účtu.',
}


// ── Page ─────────────────────────────────────────────

export default function DatabazePage() {
  return (
    <main className="min-h-screen">
      <PageHero
        tag="Databáze incidentů"
        title="Ověř protistranu"
        highlight="před transakcí"
        description="Veřejná databáze nahlášených obchodních incidentů. Vlož telefon, e-mail nebo číslo účtu a zjisti, zda byl subjekt nahlášen."
      />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
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
            placeholder="Telefon, e-mail, číslo účtu…"
            className="surface-card-elevated flex-1 rounded-xl border border-border bg-card p-4 text-base font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition hover:brightness-110 sm:px-8"
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

        {/* ── CTA cards ──────────────────────────── */}
        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CtaCard
            href="/databaze/nahlasit"
            icon={<Plus size={24} aria-hidden="true" />}
            title="Nahlásit incident"
            description="Sdílej zkušenost s ostatními"
            emphasize
          />
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
