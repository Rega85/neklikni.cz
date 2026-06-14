/**
 * /databaze/pripad/[id] — detail veřejně publikovaného incidentu.
 *
 * Server component, public (žádný auth check pro zobrazení stránky).
 *
 * Veřejně (bez přihlášení):
 *   - Typ identifikátoru + maskovaná hodnota
 *   - Kategorie, datum nahlášení
 *   - Badge "Nahlášeno uživateli"
 *   - Měkký prompt k registraci
 *
 * Přihlášený uživatel navíc vidí:
 *   - Plný identifikátor
 *   - Časovou osu všech publikovaných nahlášení subjektu
 *   - Popis incidentu
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  AlertCircle,
  CreditCard,
  Facebook,
  Globe,
  Hash,
  HelpCircle,
  Lock,
  Mail,
  Phone,
  Scale,
  Search as SearchIcon,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORY_LABELS, type IdentifierType } from '@/types/databaze'
import { identifierLabel } from '@/utils/databaze/identifiers'
import { getPublishedIncidentDetail } from '../../_lib/recentIncidents'

export const dynamic = 'force-dynamic'


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


async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )
    const { data } = await supabase.auth.getUser()
    return data.user?.id ?? null
  } catch {
    return null
  }
}


// ── Metadata ─────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const incident = await getPublishedIncidentDetail(id, false)

  if (!incident) {
    return { title: 'Případ nenalezen — Neklikni.cz' }
  }

  const label =
    incident.category === 'other' && incident.categoryOther
      ? incident.categoryOther
      : CATEGORY_LABELS[incident.category]
  const identifier = incident.identifiers[0]
  const idLabel = identifier
    ? `${identifierLabel(identifier.type, identifier.valueMasked)} ${identifier.valueMasked}`
    : ''

  return {
    title: `${label} — nahlášený případ — Neklikni.cz`,
    description: `Nahlášený případ: ${label}. ${idLabel}. Zveřejněno ${formatCzechDate(incident.publicAt)}. Veřejná databáze nahlášených obchodních incidentů Neklikni.cz.`,
  }
}


// ── Page ─────────────────────────────────────────────

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = await getCurrentUserId()
  const incident = await getPublishedIncidentDetail(id, userId !== null)

  if (!incident) notFound()

  const label =
    incident.category === 'other' && incident.categoryOther
      ? incident.categoryOther
      : CATEGORY_LABELS[incident.category]

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <Link
          href="/databaze"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          ← Zpět do databáze
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
              Nahlášeno uživateli
            </span>
            <span className="text-xs text-muted-foreground">
              Zveřejněno {formatCzechDate(incident.publicAt)}
            </span>
          </div>

          <h1 className="mb-4 text-2xl font-bold text-foreground">{label}</h1>

          {/* ── Identifikátory ──────────────────── */}
          <div className="mb-6 space-y-2">
            {incident.identifiers.map((identifier, idx) => {
              const Icon = TYPE_ICON[identifier.type]
              return (
                <div
                  key={`${identifier.type}_${idx}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                >
                  <Icon size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">
                    {identifierLabel(identifier.type, identifier.valueMasked)}:
                  </span>
                  <span className="font-mono text-foreground">
                    {identifier.value ?? identifier.valueMasked}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="mb-6 text-sm text-muted-foreground">
            Datum nahlášené události: {formatCzechDate(incident.incidentDate)}
          </p>

          {userId ? (
            <>
              {/* ── Popis ────────────────────────── */}
              <div className="mb-6">
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Popis
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {incident.description}
                </p>
              </div>

              {/* ── Časová osa ───────────────────── */}
              {incident.timeline.length > 1 && (
                <div className="mb-6">
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Časová osa nahlášení tohoto subjektu
                  </h2>
                  <ul className="space-y-2">
                    {incident.timeline.map((entry) => {
                      const entryLabel =
                        entry.category === 'other' && entry.categoryOther
                          ? entry.categoryOther
                          : CATEGORY_LABELS[entry.category]
                      return (
                        <li
                          key={entry.id}
                          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                            entry.id === incident.id
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-border bg-secondary/40'
                          }`}
                        >
                          <span className="text-foreground">{entryLabel}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCzechDate(entry.publicAt)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <Lock size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Zaregistrujte se zdarma a uvidíte detaily a důkazy.
                </p>
                <Link
                  href="/register"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
                >
                  Registrovat zdarma
                </Link>
              </div>
            </div>
          )}

          {/* ── Disclaimer ───────────────────────── */}
          <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/40 p-4">
            <AlertCircle
              size={16}
              className="mt-0.5 flex-shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Údaje pocházejí od uživatelů a procházejí AI předkontrolou.
              Subjekt nebyl posouzen soudem ani jiným orgánem jako protiprávní.
              Dotčená osoba má právo se k záznamu vyjádřit (§ 184 trestního
              zákoníku, GDPR článek 15).
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/databaze/claim"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary"
            >
              <Scale size={14} aria-hidden="true" />
              Toto je o mně, chci se vyjádřit
            </Link>
            <Link
              href="/databaze/hledat"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary"
            >
              <SearchIcon size={14} aria-hidden="true" />
              Vyhledat jiný subjekt
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
