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
  ArrowRight,
  Check,
  CreditCard,
  Facebook,
  Globe,
  Hash,
  HelpCircle,
  Loader2,
  CheckCircle2,
  Lightbulb,
  Lock,
  Mail,
  Megaphone,
  Phone,
  Search as SearchIcon,
  ShieldCheck,
  Sparkles,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import {
  CATEGORY_LABELS,
  type IdentifierType,
  type IncidentCategory,
  type SubjectVisibility,
} from '@/types/databaze'
import { detectIdentifierType, identifierLabel, looksLikeFullMessage } from '@/utils/databaze/identifiers'
import ReferralCard from '@/app/components/ReferralCard'
import AnalysisScanner from '@/app/components/AnalysisScanner'


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

interface LimitReachedState {
  /** Server odpověděl 429 — anonymní uživatel vyčerpal 1 dotaz / 24h. */
  message: string
  requireRegistration: boolean
}


// ── Display metadata ─────────────────────────────────

const TYPE_ICON: Record<IdentifierType, LucideIcon> = {
  phone: Phone,
  account: CreditCard,
  email: Mail,
  facebook_url: Facebook,
  website: Globe,
  var_symbol: Hash,
  other: HelpCircle,
}

const TYPE_LABEL: Record<IdentifierType, string> = {
  phone: 'Telefon',
  account: 'Číslo účtu',
  email: 'E-mail',
  facebook_url: 'Facebook',
  website: 'Web',
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

  let color = 'text-success'
  if (clamped < 30) color = 'text-destructive'
  else if (clamped < 60) color = 'text-warning'
  else if (clamped < 80) color = 'text-warning'

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
          className="text-border"
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
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          trust score
        </span>
      </div>
    </div>
  )
}


// ── Result panels ────────────────────────────────────

function NotFoundPanel({
  message,
  searchedQuery,
}: {
  message: string
  /** Surová hodnota, kterou uživatel zadal — předáváme do /databaze/nahlasit?prefill=… */
  searchedQuery: string
}) {
  const reportUrl = searchedQuery.trim()
    ? `/databaze/nahlasit?prefill=${encodeURIComponent(searchedQuery.trim())}`
    : '/databaze/nahlasit'

  return (
    <section className="surface-card-elevated rounded-2xl border border-primary/30 bg-primary/5 p-6 backdrop-blur-md sm:p-8">
      <div className="flex items-start gap-3">
        <ShieldCheck size={28} className="flex-shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Tento subjekt zatím není v naší databázi
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>

          {/* ── Konverzní pobídka: nahlas incident ───────────────── */}
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
            <div className="flex items-start gap-3">
              <Megaphone size={22} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Podvedl tě? Pomoz ostatním a nahlas ho.
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tvoje zkušenost ochrání další lidi. Nahlášení projde AI
                    předkontrolou a manuálním schválením, dotčená osoba má 14 dní
                    na vyjádření.
                  </p>
                </div>

                <Link
                  href={reportUrl}
                  className="bg-primary hover:brightness-110 text-primary-foreground inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition"
                >
                  Nahlásit incident
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>

                {searchedQuery.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Identifikátor{' '}
                    <span className="font-mono text-muted-foreground">
                      {searchedQuery.trim()}
                    </span>{' '}
                    se předvyplní do formuláře.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Sekundární akce ──────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/databaze/hledat"
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-secondary"
            >
              Vyhledat jiný subjekt
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              Vrátit se zpět
            </Link>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Trvejte na osobním vyzvednutí, používejte escrow služby (Bazoš
            Bezpečně, Sbazar Bezpečný nákup), nikdy neposílejte peníze předem
            a ověřte identitu (Bank iD nebo OP).
          </p>
        </div>
      </div>
    </section>
  )
}


function LimitReachedPanel() {
  return (
    <section className="surface-card-elevated rounded-2xl border border-primary/40 bg-primary/5 p-6 backdrop-blur-md sm:p-8">
      <div className="flex items-start gap-3">
        <Sparkles size={28} className="flex-shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Dnes jsi už jeden subjekt ověřil/a
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              První ověření je <strong className="text-foreground">zdarma bez registrace</strong>.
              Pro neomezené vyhledávání se zaregistruj — je to taky zdarma a
              zabere to půl minuty.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="bg-primary hover:brightness-110 text-primary-foreground inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition"
            >
              Registrovat se zdarma
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/login?redirect=/databaze/hledat"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition hover:border-muted-foreground hover:bg-secondary/80"
            >
              Už mám účet — přihlásit
            </Link>
          </div>

          <ul className="space-y-1.5 pt-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check size={14} className="mt-0.5 flex-shrink-0 text-success" aria-hidden="true" />
              <span>Neomezené vyhledávání v databázi</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="mt-0.5 flex-shrink-0 text-success" aria-hidden="true" />
              <span>Možnost nahlásit podvod</span>
            </li>
            <li className="flex items-start gap-2">
              <Check size={14} className="mt-0.5 flex-shrink-0 text-success" aria-hidden="true" />
              <span>E-mailové upozornění při shodě s tvými ověřovanými subjekty</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}


function FoundPanel({
  subject,
  normalizedValue,
  tier,
  searchedQuery,
}: {
  subject: SearchResultSubject
  normalizedValue?: string
  tier: string | null
  searchedQuery: string
}) {
  const isPaidTier = tier === 'basic' || tier === 'pro' || tier === 'oneshot'
  const reportUrl = searchedQuery.trim()
    ? `/databaze/nahlasit?prefill=${encodeURIComponent(searchedQuery.trim())}`
    : '/databaze/nahlasit'
  const isDanger = subject.trust_score < 50
  const cardClass = isDanger
    ? 'border-destructive/30 bg-destructive/10'
    : 'border-warning/30 bg-warning/10'

  return (
    <section
      className={`surface-card-elevated rounded-2xl border p-6 backdrop-blur-md sm:p-8 ${cardClass}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={28}
          className={`flex-shrink-0 ${isDanger ? 'text-destructive' : 'text-warning'}`}
          aria-hidden="true"
        />
        <div className="flex-1 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              ⚠️ Subjekt evidován v databázi
            </h2>
            {normalizedValue && (
              <p className="mt-1 text-xs text-muted-foreground">
                Hledáno: <span className="font-mono text-muted-foreground">{normalizedValue}</span>
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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nejčastější kategorie
              </h3>
              <div className="flex flex-wrap gap-2">
                {subject.top_categories.map((c) => (
                  <span
                    key={c.category}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
                  >
                    <span aria-hidden="true">{CATEGORY_EMOJI[c.category]}</span>
                    {CATEGORY_LABELS[c.category]}
                    <span className="text-muted-foreground">× {c.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Všechny identifikátory subjektu */}
          {subject.identifiers.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Identifikátory evidované u tohoto subjektu
              </h3>
              <div className="flex flex-wrap gap-2">
                {subject.identifiers.map((id, idx) => {
                  const Icon = TYPE_ICON[id.type]
                  return (
                    <span
                      key={`${id.type}_${idx}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs"
                    >
                      <Icon size={12} className="text-muted-foreground" aria-hidden="true" />
                      <span className="text-muted-foreground">{identifierLabel(id.type, id.value_masked)}:</span>
                      <span className="font-mono text-foreground">{id.value_masked}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Údaje jsou poskytovány na základě nahlášení uživatelů a procházejí AI
            předkontrolou. Subjekt nebyl posouzen soudem ani jiným orgánem jako
            protiprávní. Dotčená osoba má právo se k záznamu vyjádřit.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Záznamy pocházejí od uživatelů a neprošly soudním ani úředním
            ověřením. Neklikni.cz neručí za jejich správnost. Rozhodnutí, jak
            s informací naložíš, je na tobě.
          </p>

          {/* ── Stalo se vám to taky? ────────────────────────── */}
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-sm text-foreground">
              Stalo se vám to taky?{' '}
              <Link href={reportUrl} className="font-semibold text-primary hover:underline">
                Nahlaste podvod a ochraňte ostatní
              </Link>
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            {!isPaidTier && (
              <Link
                href="/pricing"
                className="rounded-lg border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/20"
              >
                Více detailů s Basic plánem
              </Link>
            )}
            <Link
              href="/databaze/claim"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary"
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
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}


function LoadingPanel() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="surface-card-elevated animate-pulse rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <Loader2 size={20} className="animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Hledáme v databázi…</p>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-3/4 rounded bg-secondary" />
        <div className="h-3 w-1/2 rounded bg-secondary" />
        <div className="h-3 w-2/3 rounded bg-secondary" />
      </div>
    </section>
  )
}


function AuthedEmptyTip({
  stats,
}: {
  stats: { subjects: number | null; incidents: number | null } | null
}) {
  const hasStats =
    stats && (typeof stats.subjects === 'number' || typeof stats.incidents === 'number')
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Lightbulb size={18} className="mt-0.5 flex-shrink-0 text-warning" aria-hidden="true" />
        <div className="flex-1 space-y-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Můžeš ověřit
            telefon (+420…), e-mail, číslo účtu (12345/0100), Facebook profil
            nebo variabilní symbol. Hledá se přes maskované hashe, neukládáme
            zadané hodnoty v plné podobě.
          </p>
          {hasStats && (
            <p className="text-xs text-muted-foreground">
              V databázi je{' '}
              {typeof stats!.subjects === 'number' ? (
                <span className="font-medium text-muted-foreground">
                  {stats!.subjects.toLocaleString('cs-CZ')} subjektů
                </span>
              ) : (
                '—'
              )}
              {typeof stats!.incidents === 'number' && (
                <>
                  {' · '}
                  <span className="font-medium text-muted-foreground">
                    {stats!.incidents.toLocaleString('cs-CZ')} nahlášení
                  </span>
                </>
              )}
              .
            </p>
          )}
        </div>
      </div>
    </section>
  )
}


function UnknownFormatPanel({ message }: { message: string }) {
  return (
    <section className="surface-card-elevated rounded-2xl border border-border bg-card p-6 backdrop-blur-md sm:p-8">
      <div className="flex items-start gap-3">
        <HelpCircle size={28} className="flex-shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Tento formát neumíme prohledat
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
        </div>
      </div>
    </section>
  )
}


function ErrorPanel({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/10 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="flex-shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <p className="font-medium text-destructive">Vyhledávání selhalo</p>
          <p className="mt-1 text-sm text-destructive/80">{error}</p>
          <button
            type="button"
            onClick={onDismiss}
            className="mt-2 text-sm text-destructive underline hover:text-destructive/80"
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
  const [lastQuery, setLastQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tier, setTier] = useState<string | null>(null)
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [stats, setStats] = useState<{ subjects: number | null; incidents: number | null } | null>(null)
  const [limitReached, setLimitReached] = useState<LimitReachedState | null>(null)
  const [fullMessageWarning, setFullMessageWarning] = useState(false)

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) {
          // 401 = anonymní uživatel, ne chyba.
          setIsAuthed(false)
          return null
        }
        return r.json()
      })
      .then((d) => {
        if (d?.user?.id) {
          setIsAuthed(true)
          if (typeof d.user.email === 'string') setUserEmail(d.user.email)
        }
        if (d?.profile?.tier) setTier(d.profile.tier as string)
      })
      .catch(() => setIsAuthed(false))
  }, [])

  // Stats fetch — jen pro přihlášené (anon má hint vlevo nahoře a my chceme
  // zachovat lehkost). Selhání fetch je tichý fallback na `null`.
  useEffect(() => {
    if (isAuthed !== true) return
    fetch('/api/databaze/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === 'object') {
          setStats({
            subjects: typeof d.subjects === 'number' ? d.subjects : null,
            incidents: typeof d.incidents === 'number' ? d.incidents : null,
          })
        }
      })
      .catch(() => {})
  }, [isAuthed])

  const performSearch = useCallback(async (q: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setLimitReached(null)
    setLastQuery(q)
    try {
      const res = await fetch('/api/databaze/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<SearchResult> & {
        error?: string
        limit_reached?: boolean
        require_registration?: boolean
      }
      if (res.status === 429 && data.limit_reached) {
        setLimitReached({
          message: data.error ?? 'Limit vyhledávání vyčerpán.',
          requireRegistration: data.require_registration === true,
        })
        return
      }
      if (!res.ok) {
        throw new Error(data.error ?? 'Nepodařilo se prohledat databázi.')
      }
      setResult(data as SearchResult)
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

    const detectedType = detectIdentifierType(q)
    const UNAMBIGUOUS = ['phone', 'email', 'account', 'facebook_url', 'website']
    const isUnambiguous = detectedType !== null && UNAMBIGUOUS.includes(detectedType)

    if (!isUnambiguous && looksLikeFullMessage(q)) {
      setFullMessageWarning(true)
      return
    }

    setFullMessageWarning(false)
    const url = `/databaze/hledat?q=${encodeURIComponent(q)}`
    router.push(url, { scroll: false })
    void performSearch(q)
  }

  return (
    <main className="min-h-screen text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <header className="mb-8 animate-fade-up text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="brand-gradient-text">Ověř protistranu v databázi</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Vlož telefon, e-mail, číslo účtu nebo Facebook profil. Zjistíš,
            zda na něj bylo podáno nahlášení.
          </p>
          {isAuthed === false && (
            <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs text-primary">
              <Lock size={12} aria-hidden="true" />
              <span>
                První ověření zdarma bez registrace. Pro neomezené vyhledávání{' '}
                <Link
                  href="/register"
                  className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80"
                >
                  se zaregistruj
                </Link>
                .
              </span>
            </p>
          )}
          {isAuthed === true && (
            <div className="mx-auto mt-4 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <UserCheck size={12} className="text-muted-foreground" aria-hidden="true" />
                {userEmail ? (
                  <>
                    Přihlášen jako{' '}
                    <span className="font-medium text-muted-foreground">{userEmail}</span>
                  </>
                ) : (
                  <span>Přihlášen</span>
                )}
              </span>
              <span aria-hidden="true" className="text-border">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/5 px-2.5 py-0.5 text-[11px] font-medium text-success">
                <CheckCircle2 size={11} aria-hidden="true" />
                Neomezené ověřování
              </span>
            </div>
          )}
        </header>

        <form onSubmit={handleSubmit} className="mb-8 flex flex-col sm:flex-row rounded-xl border border-border bg-card overflow-hidden transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="+420 ... | email@... | 12345/0100 | facebook.com/..."
            disabled={isLoading}
            className="flex-1 border-0 bg-transparent p-4 text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="bg-primary hover:brightness-110 text-primary-foreground inline-flex items-center justify-center gap-2 border-t border-border px-6 py-4 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:border-t-0 sm:border-l sm:px-8"
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

        {fullMessageWarning && (
          <div className="mb-6 rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
            <p className="text-sm text-warning leading-relaxed">
              Tohle vypadá jako celá zpráva, ne jako identifikátor prodejce.
              Chceš ji prověřit jako podezřelou zprávu?
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/?q=${encodeURIComponent(query)}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:brightness-110 px-4 py-2 text-xs font-bold text-primary-foreground transition-colors"
              >
                Prověřit zprávu jako podvod →
              </a>
              <button
                type="button"
                onClick={() => { setFullMessageWarning(false); void performSearch(query) }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border hover:border-muted-foreground px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Přesto hledat v databázi
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {error && <ErrorPanel error={error} onDismiss={() => setError(null)} />}
          {isLoading && (
            <AnalysisScanner messages={[
              'Hledáme v databázi…',
              'Porovnáváme identifikátory…',
              'Zpracováváme výsledky…',
            ]} />
          )}
          {!isLoading && limitReached && <LimitReachedPanel />}
          {!isLoading && !limitReached && result && (
            <>
              {result.found && result.subject ? (
                <FoundPanel
                  subject={result.subject}
                  normalizedValue={result.normalized_value}
                  tier={tier}
                  searchedQuery={lastQuery}
                />
              ) : result.detected_type === null ? (
                // API nerozpoznalo formát — bez "Nahlásit incident" CTA
                <UnknownFormatPanel message={result.message ?? ''} />
              ) : (
                <NotFoundPanel
                  message={result.message ?? 'Žádný výsledek.'}
                  searchedQuery={lastQuery}
                />
              )}
              <ReferralCard isLoggedIn={isAuthed} />
            </>
          )}
          {/* Empty-state tip pro přihlášené před prvním dotazem — zaplňuje
              prázdno užitečným kontextem, nezavádí žádné konverzní CTA. */}
          {isAuthed === true && !isLoading && !error && !limitReached && !result && (
            <AuthedEmptyTip stats={stats} />
          )}
        </div>
      </div>
    </main>
  )
}
