'use client'

/**
 * /databaze/hledat — veřejné vyhledávání subjektu v databázi.
 *
 * URL: /databaze/hledat?q=<query> (volitelné, auto-search při mount)
 *
 * Klient-side stránka:
 *   - Search formulář s auto-focusem
 *   - POST na /api/databaze/search
 *   - 3 výsledné scénáře: found / not-found / loading
 *   - Sync URL při submitu (router.push)
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  CreditCard,
  Facebook,
  Hash,
  HelpCircle,
  Loader2,
  Mail,
  Phone,
  Search as SearchIcon,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import {
  CATEGORY_LABELS,
  type IdentifierType,
  type IncidentCategory,
  type SubjectVisibility,
} from '@/types/databaze'
import { identifierLabel } from '@/utils/databaze/identifiers'


// ── API response shapes ──────────────────────────────

interface SearchResultSubject {
  id: string
  display_name_masked: string
  trust_score: number
  visibility_status: SubjectVisibility
  incident_count: number
  top_categories: Array<{ category: IncidentCategory; count: number }>
  date_range: { from: string; to: string } | null
  is_claimed: boolean
  identifiers: Array<{
    type: IdentifierType
    value_masked: string
    verified: boolean
  }>
}

interface SearchResult {
  found: boolean
  detected_type: IdentifierType | null
  normalized_value?: string
  subject?: SearchResultSubject
  message?: string
}


// ── Display metadata ─────────────────────────────────

const TYPE_ICON: Record<IdentifierType, LucideIcon> = {
  phone: Phone,
  account: CreditCard,
  email: Mail,
  facebook_url: Facebook,
  var_symbol: Hash,
  other: HelpCircle,
}

const TYPE_LABEL: Record<IdentifierType, string> = {
  phone: 'Telefon',
  account: 'Číslo účtu',
  email: 'E-mail',
  facebook_url: 'Facebook',
  var_symbol: 'Var. symbol',
  other: 'Identifikátor',
}

const CATEGORY_EMOJI: Record<IncidentCategory, string> = {
  non_delivery: '📦',
  misrepresentation: '🎭',
  fake_courier: '🚚',
  disappeared_listing: '👻',
  fake_profile: '🪪',
  romance: '💔',
  investment: '📈',
  rental: '🏠',
  tickets: '🎫',
  employment: '💼',
  other: '❓',
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


// ── Trust score gauge (SVG circle) ───────────────────

function TrustGauge({ score }: { score: number }) {
  const radius = 50
  const stroke = 10
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference

  let color = 'text-emerald-400'
  if (clamped < 30) color = 'text-red-400'
  else if (clamped < 60) color = 'text-orange-400'
  else if (clamped < 80) color = 'text-amber-400'

  return (
    <div className="relative inline-flex h-32 w-32 items-center justify-center">
      <svg
        viewBox="0 0 120 120"
        className="h-32 w-32 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-slate-800"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{clamped}</span>
        <span className="text-xs uppercase tracking-wide text-slate-500">
          trust score
        </span>
      </div>
    </div>
  )
}


// ── Result panels ────────────────────────────────────

function NotFoundPanel({ message }: { message: string }) {
  return (
    <section className="surface-card-elevated rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-6 backdrop-blur-md sm:p-8">
      <div className="flex items-start gap-3">
        <ShieldCheck size={28} className="flex-shrink-0 text-cyan-300" aria-hidden="true" />
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-slate-100">
            Žádný záznam v naší databázi
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">{message}</p>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-100">
              Co dělat dál (i tak buďte opatrní):
            </h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" aria-hidden="true" />
                <span>Trvejte na osobním vyzvednutí.</span>
              </li>

              <li>
                <div className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" aria-hidden="true" />
                  <span>Použijte ověřenou platbu / escrow:</span>
                </div>
                <ul className="mt-1 ml-6 list-disc space-y-0.5 text-slate-400">
                  <li>
                    <a
                      href="https://www.bazos.cz/bezpecne-platby/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 underline hover:text-cyan-200"
                    >
                      Bazoš Bezpečně
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.sbazar.cz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 underline hover:text-cyan-200"
                    >
                      Sbazar Bezpečný nákup
                    </a>
                  </li>
                  <li>Dobírka (platba při převzetí).</li>
                </ul>
              </li>

              <li className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" aria-hidden="true" />
                <span>Neposílejte peníze předem.</span>
              </li>

              <li>
                <div className="flex items-start gap-2">
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" aria-hidden="true" />
                  <span>Ověřte identitu:</span>
                </div>
                <ul className="mt-1 ml-6 list-disc space-y-0.5 text-slate-400">
                  <li>
                    <a
                      href="https://www.bankid.cz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 underline hover:text-cyan-200"
                    >
                      Bank iD
                    </a>
                  </li>
                  <li>Nebo si nechte ukázat občanský průkaz (osobně).</li>
                </ul>
              </li>

              <li className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 flex-shrink-0 text-cyan-400" aria-hidden="true" />
                <span>Hledejte hodnocení i jinde (Google, Heureka).</span>
              </li>
            </ul>
          </div>

          <Link
            href="/databaze/nahlasit"
            className="brand-gradient mt-2 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)]"
          >
            Nahlásit nový incident
          </Link>
        </div>
      </div>
    </section>
  )
}


function FoundPanel({
  subject,
  normalizedValue,
  tier,
}: {
  subject: SearchResultSubject
  normalizedValue?: string
  tier: string | null
}) {
  const isPaidTier = tier === 'basic' || tier === 'pro' || tier === 'oneshot'
  const isDanger = subject.trust_score < 50
  const cardClass = isDanger
    ? 'border-red-500/30 bg-red-500/10'
    : 'border-amber-500/30 bg-amber-500/10'

  return (
    <section
      className={`surface-card-elevated rounded-2xl border p-6 backdrop-blur-md sm:p-8 ${cardClass}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={28}
          className={`flex-shrink-0 ${isDanger ? 'text-red-400' : 'text-amber-400'}`}
          aria-hidden="true"
        />
        <div className="flex-1 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              ⚠️ Subjekt evidován v databázi
            </h2>
            {normalizedValue && (
              <p className="mt-1 text-xs text-slate-400">
                Hledáno: <span className="font-mono text-slate-300">{normalizedValue}</span>
              </p>
            )}
          </div>

          {/* Trust gauge + stats */}
          <div className="flex flex-wrap items-center gap-6">
            <TrustGauge score={subject.trust_score} />

            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <StatBox label="Nahlášení" value={String(subject.incident_count)} />
              <StatBox
                label="Časové rozmezí"
                value={
                  subject.date_range
                    ? `${formatCzechDate(subject.date_range.from)} — ${formatCzechDate(subject.date_range.to)}`
                    : '—'
                }
              />
              <StatBox
                label="Status"
                value={subject.is_claimed ? 'Aktivně reaguje' : 'Bez vyjádření'}
              />
            </div>
          </div>

          {/* Top kategorie */}
          {subject.top_categories.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Nejčastější kategorie
              </h3>
              <div className="flex flex-wrap gap-2">
                {subject.top_categories.map((c) => (
                  <span
                    key={c.category}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-200"
                  >
                    <span aria-hidden="true">{CATEGORY_EMOJI[c.category]}</span>
                    {CATEGORY_LABELS[c.category]}
                    <span className="text-slate-500">× {c.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Všechny identifikátory subjektu */}
          {subject.identifiers.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Identifikátory evidované u tohoto subjektu
              </h3>
              <div className="flex flex-wrap gap-2">
                {subject.identifiers.map((id, idx) => {
                  const Icon = TYPE_ICON[id.type]
                  return (
                    <span
                      key={`${id.type}_${idx}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs"
                    >
                      <Icon size={12} className="text-slate-400" aria-hidden="true" />
                      <span className="text-slate-400">{identifierLabel(id.type, id.value_masked)}:</span>
                      <span className="font-mono text-slate-200">{id.value_masked}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs leading-relaxed text-slate-400">
            Údaje jsou poskytovány na základě nahlášení uživatelů a procházejí AI
            předkontrolou. Subjekt nebyl posouzen soudem ani jiným orgánem jako
            protiprávní. Dotčená osoba má právo se k záznamu vyjádřit.
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            Záznamy pocházejí od uživatelů a neprošly soudním ani úředním
            ověřením. Neklikni.cz neručí za jejich správnost. Rozhodnutí, jak
            s informací naložíš, je na tobě.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            {!isPaidTier && (
              <Link
                href="/pricing"
                className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-5 py-2.5 text-sm font-medium text-purple-200 transition hover:border-purple-400 hover:bg-purple-500/20"
              >
                Více detailů s Basic plánem
              </Link>
            )}
            <Link
              href="/databaze/claim"
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
            >
              Toto je o mně, chci se vyjádřit
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}


function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{value}</p>
    </div>
  )
}


function LoadingPanel() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="surface-card-elevated animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <Loader2 size={20} className="animate-spin text-purple-400" aria-hidden="true" />
        <p className="text-sm text-slate-300">Hledáme v databázi…</p>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-800" />
        <div className="h-3 w-1/2 rounded bg-slate-800" />
        <div className="h-3 w-2/3 rounded bg-slate-800" />
      </div>
    </section>
  )
}


function ErrorPanel({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="flex-shrink-0 text-red-400" aria-hidden="true" />
        <div>
          <p className="font-medium text-red-300">Vyhledávání selhalo</p>
          <p className="mt-1 text-sm text-red-300/80">{error}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-2 text-sm text-red-300 underline hover:text-red-200"
          >
            Skrýt chybu
          </button>
        </div>
      </div>
    </section>
  )
}


// ── Page ─────────────────────────────────────────────

export default function HledatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tier, setTier] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.profile?.tier) setTier(d.profile.tier as string)
      })
      .catch(() => {})
  }, [])

  const performSearch = useCallback(async (q: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/databaze/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error ?? 'Nepodařilo se prohledat databázi.')
      }
      const data = (await res.json()) as SearchResult
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // On mount: auto-search z URL nebo focus na input
  useEffect(() => {
    const initial = searchParams.get('q')
    if (initial && initial.trim() !== '') {
      setQuery(initial)
      void performSearch(initial)
    } else {
      inputRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q || isLoading) return
    const url = `/databaze/hledat?q=${encodeURIComponent(q)}`
    router.push(url, { scroll: false })
    void performSearch(q)
  }

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <header className="mb-8 animate-fade-up text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="brand-gradient-text">Ověř protistranu v databázi</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300 sm:text-base">
            Vlož telefon, e-mail, číslo účtu nebo Facebook profil. Zjistíš,
            zda na něj bylo podáno nahlášení.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-3 sm:flex-row">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="+420 ... | email@... | 12345/0100 | facebook.com/..."
            disabled={isLoading}
            className="surface-card-elevated flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-base font-medium text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="brand-gradient inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:px-8"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Hledám…
              </>
            ) : (
              <>
                <SearchIcon size={18} aria-hidden="true" />
                Ověřit
              </>
            )}
          </button>
        </form>

        <div className="space-y-4">
          {error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
          {isLoading && <LoadingPanel />}
          {result && !isLoading && (
            result.found && result.subject ? (
              <FoundPanel
                subject={result.subject}
                normalizedValue={result.normalized_value}
                tier={tier}
              />
            ) : (
              <NotFoundPanel message={result.message ?? 'Žádný výsledek.'} />
            )
          )}
        </div>
      </div>
    </main>
  )
}
