'use client'

/**
 * IncidentReportForm — klientská komponenta formuláře nahlášení.
 *
 * Aktuální stav (Step 1 implementován):
 *   - State pro celý form (FormData) drží v IncidentReportForm
 *   - Step 1 ("Co se stalo?") — datum, kategorie, platforma, závažnost
 *   - Step 2-5 zatím placeholdery
 *
 * Co kostra zatím NEMÁ:
 *   - Identifikátory protistrany (Step 2)
 *   - Popis + částka (Step 3)
 *   - Drag&drop pro důkazy (Step 4)
 *   - Konsenty + souhrn (Step 5)
 *   - Real submit handler — zatím jen console.warn
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Facebook,
  FileText,
  Info,
  Loader2,
  Plus,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  CATEGORY_LABELS,
  PLATFORM_LABELS,
  SEVERITY_LABELS,
  type IdentifierType,
  type IncidentCategory,
  type IncidentPlatform,
  type IncidentSeverity,
} from '@/types/databaze'
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  detectIdentifierType,
  maskIdentifier,
  normalizeAccount,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizePhone,
  normalizeVarSymbol,
} from '@/utils/databaze/identifiers'
import { compressImage, isCompressibleImage } from '@/utils/databaze/imageCompress'
import { Stepper } from './components/Stepper'

const TOTAL_STEPS = 5

const STEP_LABELS = ['Co se stalo?', 'O kom?', 'Detaily', 'Důkazy', 'Potvrzení']

// Verze znění tří souhlasů (Step 5). Posílá se do API a perzistuje
// v audit_log.metadata.consent.version — kdyby se znění v budoucnu
// změnilo, existující záznamy zachovají vazbu na text, který uživatel
// reálně viděl. Bump při jakékoli změně textu v ConsentRow níže.
const CONSENT_VERSION = '2026-05'

// Typované option arrays — `Object.entries` ztrácí specifický typ klíče.
const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as Array<[IncidentCategory, string]>
const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS) as Array<[IncidentPlatform, string]>
const SEVERITY_OPTIONS = Object.entries(SEVERITY_LABELS) as Array<[IncidentSeverity, string]>

// Sdílené class strings pro inputy a selecty — drží konzistenci v brand stylu.
const FIELD_BASE =
  'w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30'
const LABEL_BASE = 'mb-1.5 block text-sm font-medium text-slate-100'


// ── Form data shape ──────────────────────────────────

interface IdentifierItem {
  id: string
  type: IdentifierType
  value: string
  /** True pokud `type` přišel z auto-detekce, false po manuálním overridu. */
  autoDetected: boolean
}

interface FormData {
  // Step 1
  incident_date: string
  category: IncidentCategory | ''
  category_other: string
  platform: IncidentPlatform | ''
  platform_other: string
  severity: IncidentSeverity | ''

  // Step 2
  identifiers: IdentifierItem[]

  // Step 3
  amount_czk: number
  description: string

  // Step 4
  evidence_files: File[]

  // Step 5
  truth_confirmation: boolean
  data_processing_consent: boolean
  law_enforcement_consent: boolean
}

function newIdentifier(): IdentifierItem {
  return {
    id: crypto.randomUUID(),
    type: 'other',
    value: '',
    autoDetected: false,
  }
}

function initialFormData(): FormData {
  return {
    incident_date: new Date().toISOString().split('T')[0],
    category: '',
    category_other: '',
    platform: '',
    platform_other: '',
    severity: '',
    identifiers: [newIdentifier()],
    amount_czk: 0,
    description: '',
    evidence_files: [],
    truth_confirmation: false,
    data_processing_consent: false,
    law_enforcement_consent: false,
  }
}


// ── Identifier helpers (klient zrcadlí utils/databaze/identifiers) ──

function normalizeByType(type: IdentifierType, raw: string): string | null {
  switch (type) {
    case 'phone':
      return normalizePhone(raw)
    case 'account':
      return normalizeAccount(raw)
    case 'email':
      return normalizeEmail(raw)
    case 'facebook_url':
      return normalizeFacebookUrl(raw)
    case 'var_symbol':
      return normalizeVarSymbol(raw)
    case 'other':
      return raw.trim() === '' ? null : raw.trim()
    default:
      return null
  }
}

function isIdentifierValid(item: IdentifierItem): boolean {
  if (!item.value.trim()) return false
  return normalizeByType(item.type, item.value) !== null
}

interface TypeMeta {
  icon: string
  label: string
  chipClass: string
}

const IDENTIFIER_TYPE_META: Record<IdentifierType, TypeMeta> = {
  phone: {
    icon: '📞',
    label: 'Telefon',
    chipClass: 'border-blue-500/30 bg-blue-500/15 text-blue-200',
  },
  account: {
    icon: '🏦',
    label: 'Číslo účtu',
    chipClass: 'border-green-500/30 bg-green-500/15 text-green-200',
  },
  email: {
    icon: '✉️',
    label: 'E-mail',
    chipClass: 'border-purple-500/30 bg-purple-500/15 text-purple-200',
  },
  facebook_url: {
    icon: '👤',
    label: 'Facebook profil',
    chipClass: 'border-blue-600/30 bg-blue-600/15 text-blue-100',
  },
  var_symbol: {
    icon: '🔢',
    label: 'Variabilní symbol',
    chipClass: 'border-amber-500/30 bg-amber-500/15 text-amber-200',
  },
  other: {
    icon: '❓',
    label: 'Jiné — upřesni typ',
    chipClass: 'border-slate-600/40 bg-slate-700/30 text-slate-300',
  },
}

const IDENTIFIER_TYPE_KEYS: IdentifierType[] = [
  'phone',
  'account',
  'email',
  'facebook_url',
  'var_symbol',
  'other',
]


// ── Validace per-step ────────────────────────────────

function isStep1Valid(d: FormData): boolean {
  if (!d.incident_date) return false
  if (!d.category) return false
  if (d.category === 'other' && d.category_other.trim() === '') return false
  if (!d.platform) return false
  if (d.platform === 'other' && d.platform_other.trim() === '') return false
  if (!d.severity) return false
  return true
}

function isStep2Valid(d: FormData): boolean {
  if (d.identifiers.length < 1) return false
  if (!d.identifiers.every(isIdentifierValid)) return false
  return true
}

const DESCRIPTION_MIN = 50
const DESCRIPTION_MAX = 1000
const AMOUNT_MAX = 100_000_000

function isStep3Valid(d: FormData): boolean {
  if (!Number.isFinite(d.amount_czk) || d.amount_czk < 0 || d.amount_czk > AMOUNT_MAX) {
    return false
  }
  const len = d.description.length
  if (len < DESCRIPTION_MIN || len > DESCRIPTION_MAX) return false
  return true
}

const MIN_EVIDENCE_FILES = 2
const MAX_EVIDENCE_FILES = 5

function isFileAllowed(file: File): boolean {
  const allowed: readonly string[] = ALLOWED_MIME_TYPES
  return file.size <= MAX_FILE_SIZE_BYTES && allowed.includes(file.type)
}

function isStep4Valid(d: FormData): boolean {
  const n = d.evidence_files.length
  if (n < MIN_EVIDENCE_FILES || n > MAX_EVIDENCE_FILES) return false
  // Defensive — files by neměly projít validací při přidání, ale check znovu
  return d.evidence_files.every(isFileAllowed)
}

function isStep5Valid(d: FormData): boolean {
  return d.truth_confirmation && d.data_processing_consent && d.law_enforcement_consent
}

function isStepValid(step: number, data: FormData): boolean {
  if (step === 1) return isStep1Valid(data)
  if (step === 2) return isStep2Valid(data)
  if (step === 3) return isStep3Valid(data)
  if (step === 4) return isStep4Valid(data)
  if (step === 5) return isStep5Valid(data)
  return true
}


// ── Hlavní komponenta ────────────────────────────────

export function IncidentReportForm() {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<{
    incidentId: string
    status: string
    message: string
  } | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  async function handleCopyShareLink() {
    try {
      await navigator.clipboard.writeText('https://www.neklikni.cz/databaze')
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      console.error('Clipboard write failed:', err)
    }
  }

  function updateFormData(patch: Partial<FormData>) {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  function goNext() {
    setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  async function handleSubmit() {
    if (isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = new FormData()
      payload.append('incident_date', formData.incident_date)
      payload.append('platform', formData.platform)
      if (formData.platform_other) payload.append('platform_other', formData.platform_other)
      payload.append('category', formData.category)
      if (formData.category_other) payload.append('category_other', formData.category_other)
      payload.append('severity', formData.severity)
      payload.append('amount_czk', String(formData.amount_czk))
      payload.append('description', formData.description)
      payload.append(
        'identifiers',
        JSON.stringify(
          formData.identifiers.map((i) => ({ type: i.type, value: i.value })),
        ),
      )
      payload.append('truth_confirmation', String(formData.truth_confirmation))
      payload.append('data_processing_consent', String(formData.data_processing_consent))
      payload.append('law_enforcement_consent', String(formData.law_enforcement_consent))
      payload.append('consent_version', CONSENT_VERSION)
      for (const file of formData.evidence_files) {
        payload.append('evidence_files', file)
      }

      const res = await fetch('/api/databaze/report', {
        method: 'POST',
        body: payload,
        // Pozor: nenastavovat Content-Type — browser doplní boundary
      })

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { error?: string }
        const msg =
          typeof errorData.error === 'string' && errorData.error
            ? errorData.error
            : 'Nepodařilo se odeslat nahlášení. Zkuste to znovu.'
        throw new Error(msg)
      }

      const result = (await res.json()) as {
        incident_id: string
        status: string
        message: string
      }
      setSubmitSuccess({
        incidentId: result.incident_id,
        status: result.status,
        message: result.message,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Neznámá chyba při odesílání.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = isStepValid(currentStep, formData)

  // ── Success state — nahrazuje celý formulář ─────────
  if (submitSuccess) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <div className="flex justify-center">
          <CheckCircle2 size={64} className="text-emerald-400" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-white">Nahlášení úspěšně odesláno</h2>
        <p className="text-slate-300">{submitSuccess.message}</p>

        <div className="inline-block rounded-lg bg-slate-900/50 p-3">
          <p className="text-xs text-slate-400">ID nahlášení:</p>
          <p className="font-mono text-sm text-purple-300">{submitSuccess.incidentId}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 pt-4">
          <a
            href="/databaze"
            className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500"
          >
            Otevřít databázi
          </a>
          <a
            href="/"
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-900"
          >
            Zpět na hlavní
          </a>
        </div>

        {/* ── Viral loop — sdílej varování ─────────────── */}
        <div className="mt-6 space-y-3 border-t border-emerald-500/20 pt-6">
          <h3 className="text-lg font-bold text-white">
            Díky. Tvoje varování může ušetřit někomu peníze i nervy.
          </h3>
          <p className="mx-auto max-w-md text-sm text-slate-300">
            Čím víc lidí ví, tím méně dalších naletí. Sdílej, ať se to dostane
            k těm, koho by to mohlo potkat.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <a
              href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.neklikni.cz%2Fdatabaze"
              target="_blank"
              rel="noopener noreferrer"
              className="brand-gradient inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)]"
            >
              <Facebook size={16} aria-hidden="true" />
              Sdílet na Facebook
            </a>
            <button
              type="button"
              onClick={handleCopyShareLink}
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
            >
              {shareCopied ? (
                <>
                  <Check size={16} className="text-emerald-400" aria-hidden="true" />
                  Zkopírováno
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  Zkopírovat odkaz
                </>
              )}
            </button>
          </div>

          <div className="pt-2">
            <a
              href="/databaze/nahlasit"
              className="text-sm text-purple-300 underline transition hover:text-purple-200"
            >
              Nahlásit další incident
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="surface-card-elevated animate-fade-up rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 backdrop-blur-md sm:p-8">
      <Stepper currentStep={currentStep} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />

      <div className="min-h-[280px]">
        {currentStep === 1 && <Step1 data={formData} onChange={updateFormData} />}
        {currentStep === 2 && <Step2 data={formData} onChange={updateFormData} />}
        {currentStep === 3 && <Step3 data={formData} onChange={updateFormData} />}
        {currentStep === 4 && <Step4 data={formData} onChange={updateFormData} />}
        {currentStep === 5 && <Step5 data={formData} onChange={updateFormData} />}
      </div>

      {submitError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="flex-shrink-0 text-red-400"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium text-red-300">Nepodařilo se odeslat nahlášení</p>
              <p className="mt-1 text-sm text-red-300/80">{submitError}</p>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="mt-2 text-sm text-red-300 underline hover:text-red-200"
              >
                Skrýt chybu
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goBack}
          disabled={currentStep === 1 || isSubmitting}
          className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Zpět
        </button>

        {currentStep < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed || isSubmitting}
            className="brand-gradient rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            Další
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed || isSubmitting}
            className="brand-gradient inline-flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                Odesílám…
              </>
            ) : (
              'Odeslat nahlášení'
            )}
          </button>
        )}
      </div>
    </section>
  )
}


// ── Step 1 — "Co se stalo?" ──────────────────────────

interface Step1Props {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
}

function Step1({ data, onChange }: Step1Props) {
  const todayIso = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-purple-300">
        <Shield size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Co se stalo?</h2>
      </div>
      <p className="text-sm text-slate-400">
        Vyber datum, kategorii, platformu a závažnost incidentu.
      </p>

      {/* Datum */}
      <div>
        <label htmlFor="incident_date" className={LABEL_BASE}>
          Datum incidentu <span className="text-red-400">*</span>
        </label>
        <input
          id="incident_date"
          type="date"
          required
          max={todayIso}
          value={data.incident_date}
          onChange={(e) => onChange({ incident_date: e.target.value })}
          className={FIELD_BASE}
        />
      </div>

      {/* Kategorie */}
      <div>
        <label htmlFor="category" className={LABEL_BASE}>
          Kategorie incidentu <span className="text-red-400">*</span>
        </label>
        <select
          id="category"
          required
          value={data.category}
          onChange={(e) => onChange({ category: e.target.value as IncidentCategory | '' })}
          className={FIELD_BASE}
        >
          <option value="" disabled>
            Vyber kategorii
          </option>
          {CATEGORY_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Kategorie — jiné (conditional) */}
      {data.category === 'other' && (
        <div>
          <label htmlFor="category_other" className={LABEL_BASE}>
            Upřesni kategorii <span className="text-red-400">*</span>
          </label>
          <input
            id="category_other"
            type="text"
            required
            maxLength={100}
            placeholder="Krátký popis kategorie"
            value={data.category_other}
            onChange={(e) => onChange({ category_other: e.target.value })}
            className={FIELD_BASE}
          />
        </div>
      )}

      {/* Platforma */}
      <div>
        <label htmlFor="platform" className={LABEL_BASE}>
          Platforma <span className="text-red-400">*</span>
        </label>
        <select
          id="platform"
          required
          value={data.platform}
          onChange={(e) => onChange({ platform: e.target.value as IncidentPlatform | '' })}
          className={FIELD_BASE}
        >
          <option value="" disabled>
            Vyber platformu
          </option>
          {PLATFORM_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Platforma — jiné (conditional) */}
      {data.platform === 'other' && (
        <div>
          <label htmlFor="platform_other" className={LABEL_BASE}>
            Upřesni platformu <span className="text-red-400">*</span>
          </label>
          <input
            id="platform_other"
            type="text"
            required
            maxLength={100}
            placeholder="Krátký popis platformy"
            value={data.platform_other}
            onChange={(e) => onChange({ platform_other: e.target.value })}
            className={FIELD_BASE}
          />
        </div>
      )}

      {/* Závažnost */}
      <div>
        <label htmlFor="severity" className={LABEL_BASE}>
          Závažnost <span className="text-red-400">*</span>
        </label>
        <select
          id="severity"
          required
          value={data.severity}
          onChange={(e) => onChange({ severity: e.target.value as IncidentSeverity | '' })}
          className={FIELD_BASE}
        >
          <option value="" disabled>
            Vyber závažnost
          </option>
          {SEVERITY_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-slate-500">
          Pokus = bez ztráty; Drobný = do 1 000 Kč; Střední = 1–10 tis. Kč; Velký = 10–100 tis. Kč; Závažný = nad 100 tis. Kč.
        </p>
      </div>
    </div>
  )
}


// ── Placeholder kroky ────────────────────────────────
// Step 2-5 zatím nemají implementaci, jen TODO komentáře.

// ── Step 2 — "O kom?" (identifikátory + volitelný kontakt) ──

const MAX_IDENTIFIERS = 5
const MIN_AUTODETECT_LENGTH = 4

interface Step2Props {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
}

function Step2({ data, onChange }: Step2Props) {
  const addIdentifier = useCallback(() => {
    if (data.identifiers.length >= MAX_IDENTIFIERS) return
    onChange({ identifiers: [...data.identifiers, newIdentifier()] })
  }, [data.identifiers, onChange])

  const removeIdentifier = useCallback(
    (id: string) => {
      onChange({ identifiers: data.identifiers.filter((i) => i.id !== id) })
    },
    [data.identifiers, onChange],
  )

  const updateIdentifier = useCallback(
    (id: string, patch: Partial<IdentifierItem>) => {
      onChange({
        identifiers: data.identifiers.map((i) =>
          i.id === id ? { ...i, ...patch } : i,
        ),
      })
    },
    [data.identifiers, onChange],
  )

  const handleValueChange = useCallback(
    (id: string, newValue: string) => {
      const trimmed = newValue.trim()
      if (trimmed.length >= MIN_AUTODETECT_LENGTH) {
        const detected = detectIdentifierType(newValue)
        if (detected) {
          updateIdentifier(id, { value: newValue, type: detected, autoDetected: true })
          return
        }
        updateIdentifier(id, { value: newValue, type: 'other', autoDetected: false })
        return
      }
      // Pod prahem — jen aktualizuj value, type necháme jak je.
      updateIdentifier(id, { value: newValue })
    },
    [updateIdentifier],
  )

  const canAdd = data.identifiers.length < MAX_IDENTIFIERS

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-pink-300">
        <AlertCircle size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">O kom?</h2>
      </div>
      <p className="text-sm text-slate-400">
        Zadej identifikátor subjektu nahlášení (telefon, číslo účtu, e-mail,
        Facebook profil nebo variabilní symbol). Hodnoty server automaticky
        normalizuje a hashuje.
      </p>

      <div className="space-y-3">
        {data.identifiers.map((item) => (
          <IdentifierCard
            key={item.id}
            item={item}
            onValueChange={(v) => handleValueChange(item.id, v)}
            onTypeChange={(t) =>
              updateIdentifier(item.id, { type: t, autoDetected: false })
            }
            onRemove={
              data.identifiers.length > 1 ? () => removeIdentifier(item.id) : undefined
            }
          />
        ))}

        <button
          type="button"
          onClick={addIdentifier}
          disabled={!canAdd}
          className="group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-900/50 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Plus size={16} aria-hidden="true" />
          {canAdd
            ? 'Přidat další identifikátor'
            : `Maximum ${MAX_IDENTIFIERS} identifikátorů na nahlášení`}
        </button>
      </div>

    </div>
  )
}


interface IdentifierCardProps {
  item: IdentifierItem
  onValueChange: (value: string) => void
  onTypeChange: (type: IdentifierType) => void
  onRemove?: () => void
}

function IdentifierCard({
  item,
  onValueChange,
  onTypeChange,
  onRemove,
}: IdentifierCardProps) {
  const meta = IDENTIFIER_TYPE_META[item.type]
  const trimmed = item.value.trim()
  const valid = trimmed === '' ? null : isIdentifierValid(item)

  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-start gap-2">
        <input
          type="text"
          placeholder="Vlož telefon, číslo účtu, e-mail, FB profil nebo variabilní symbol"
          value={item.value}
          onChange={(e) => onValueChange(e.target.value)}
          className={`${FIELD_BASE} flex-1`}
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Smazat identifikátor"
            className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/10"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.chipClass}`}
        >
          <span aria-hidden="true">{meta.icon}</span>
          {meta.label}
        </span>

        {item.autoDetected && (
          <span className="text-xs text-slate-500">(auto)</span>
        )}

        <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-400">
          <span>Změnit typ:</span>
          <select
            value={item.type}
            onChange={(e) => onTypeChange(e.target.value as IdentifierType)}
            className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          >
            {IDENTIFIER_TYPE_KEYS.map((t) => (
              <option key={t} value={t}>
                {IDENTIFIER_TYPE_META[t].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {valid === true && (
        <p className="text-xs text-emerald-400">✓ Formát OK</p>
      )}
      {valid === false && (
        <p className="text-xs text-red-400">Neplatný formát pro typ „{meta.label}".</p>
      )}
    </div>
  )
}


// ── Step 3 — "Detaily" (částka + popis) ─────────────

const DESCRIPTION_WARN = 950

interface Step3Props {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
}

function Step3({ data, onChange }: Step3Props) {
  const len = data.description.length
  const tooShort = len > 0 && len < DESCRIPTION_MIN
  const ok = len >= DESCRIPTION_MIN && len < DESCRIPTION_WARN
  const nearLimit = len >= DESCRIPTION_WARN && len <= DESCRIPTION_MAX

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-purple-300">
        <AlertCircle size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Detaily</h2>
      </div>
      <p className="text-sm text-slate-400">
        Uveď výši ztráty a stručný faktický popis incidentu.
      </p>

      {/* Částka */}
      <div>
        <label htmlFor="amount_czk" className={LABEL_BASE}>
          Částka ztráty (Kč) <span className="text-red-400">*</span>
        </label>
        <input
          id="amount_czk"
          type="number"
          required
          min={0}
          max={AMOUNT_MAX}
          step={1}
          placeholder="0"
          value={
            Number.isFinite(data.amount_czk) && data.amount_czk > 0
              ? data.amount_czk
              : ''
          }
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange({ amount_czk: 0 })
              return
            }
            const parsed = Math.floor(Number(raw))
            onChange({ amount_czk: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 })
          }}
          className={`${FIELD_BASE} text-lg font-semibold`}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Pokud nedošlo ke ztrátě, zadej 0.
        </p>
      </div>

      {/* Info box — faktický tón */}
      <div className="rounded-md border-l-4 border-purple-500 bg-purple-500/10 p-3 text-sm text-slate-200">
        💡 Pište faktem, ne emocemi. Místo „okradl mě" uveďte
        „po platbě 2 500 Kč nedošlo k doručení zboží". AI vyhodnotí
        věcnost popisu.
      </div>

      {/* Popis */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor="description" className="text-sm font-medium text-slate-100">
            Popis incidentu <span className="text-red-400">*</span>
          </label>
          <span className="text-xs text-slate-500">
            {len} / {DESCRIPTION_MAX} znaků
          </span>
        </div>
        <textarea
          id="description"
          required
          minLength={DESCRIPTION_MIN}
          maxLength={DESCRIPTION_MAX}
          placeholder="Popiš stručně, co se stalo. Faktickým tónem, bez emocí. Co prodávající uvedl v inzerátu, jak probíhala komunikace, kdy ses pokusil/a o platbu, jaká částka, co se stalo dál."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={`${FIELD_BASE} min-h-[200px] resize-y leading-relaxed`}
        />
        <div className="mt-1.5 text-xs" aria-live="polite">
          {tooShort && (
            <span className="text-red-400">
              Minimálně {DESCRIPTION_MIN} znaků (zbývá {DESCRIPTION_MIN - len}).
            </span>
          )}
          {ok && (
            <span className="text-emerald-400">✓ Dostatečně podrobné</span>
          )}
          {nearLimit && (
            <span className="text-amber-400">
              Blíží se limit ({DESCRIPTION_MAX - len} znaků).
            </span>
          )}
          {len === 0 && (
            <span className="text-slate-500">
              Minimálně {DESCRIPTION_MIN} znaků, maximálně {DESCRIPTION_MAX}.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}


// ── Step 4 — "Důkazy" (drag & drop + file picker) ────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Step4Props {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
}

interface CompressionResult {
  name: string
  original: number
  final: number
}

function Step4({ data, onChange }: Step4Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [compressionInfo, setCompressionInfo] = useState<CompressionResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Sync preview URLs s evidence_files. Cleanup při změně i unmountu.
  useEffect(() => {
    const urls = data.evidence_files.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [data.evidence_files])

  const limitMB = MAX_FILE_SIZE_BYTES / (1024 * 1024)

  const addFiles = useCallback(
    async (incoming: File[]) => {
      setIsProcessing(true)
      try {
        const errors: string[] = []
        const validToAdd: File[] = []
        const compressed: CompressionResult[] = []
        const current = data.evidence_files
        const remainingSlots = MAX_EVIDENCE_FILES - current.length

        if (incoming.length > remainingSlots) {
          errors.push(
            `Maximum ${MAX_EVIDENCE_FILES} souborů na nahlášení. Některé soubory nebyly přidány.`,
          )
        }

        for (const file of incoming.slice(0, remainingSlots)) {
          let processed = file

          // Browser-side komprese pro obrázky (fallback na original při chybě).
          if (isCompressibleImage(file.type)) {
            try {
              const result = await compressImage(file)
              if (result.size < file.size) {
                compressed.push({
                  name: file.name,
                  original: file.size,
                  final: result.size,
                })
              }
              processed = result
            } catch (err) {
              console.error('Image compression failed:', err)
            }
          }

          if (processed.size > MAX_FILE_SIZE_BYTES) {
            const isPdf = processed.type === 'application/pdf'
            errors.push(
              isPdf
                ? `Soubor „${file.name}" má ${formatFileSize(processed.size)}, limit je ${formatFileSize(MAX_FILE_SIZE_BYTES)}. Zkuste menší PDF.`
                : `Soubor „${file.name}" má ${formatFileSize(processed.size)} i po kompresi, limit je ${formatFileSize(MAX_FILE_SIZE_BYTES)}.`,
            )
            continue
          }

          const allowed: readonly string[] = ALLOWED_MIME_TYPES
          if (!allowed.includes(processed.type)) {
            errors.push(
              `Soubor „${file.name}" má nepodporovaný formát (${processed.type || 'neznámý'}).`,
            )
            continue
          }

          validToAdd.push(processed)
        }

        if (validToAdd.length > 0) {
          onChange({ evidence_files: [...current, ...validToAdd] })
        }
        setFileErrors(errors)
        setCompressionInfo(compressed)
      } finally {
        setIsProcessing(false)
      }
    },
    [data.evidence_files, onChange],
  )

  const removeFile = useCallback(
    (idx: number) => {
      onChange({
        evidence_files: data.evidence_files.filter((_, i) => i !== idx),
      })
      setFileErrors([])
      setCompressionInfo([])
    },
    [data.evidence_files, onChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (isProcessing) return
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) void addFiles(files)
    },
    [addFiles, isProcessing],
  )

  const handlePickerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isProcessing) {
        e.target.value = ''
        return
      }
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) void addFiles(files)
      // Reset input value tak aby šel nahrát stejný soubor po smazání
      e.target.value = ''
    },
    [addFiles, isProcessing],
  )

  const fileCount = data.evidence_files.length
  const canAddMore = fileCount < MAX_EVIDENCE_FILES

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-cyan-300">
        <Upload size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Důkazy</h2>
      </div>
      <p className="text-sm text-slate-400">
        Nahraj 2–5 souborů jako důkaz incidentu. Podporujeme obrázky
        (PNG, JPG, WEBP) a PDF dokumenty. Velké obrázky se automaticky
        zoptimalizují, PDF musí být do {limitMB} MB.
      </p>

      {/* Info box — co se hodí jako důkaz */}
      <div className="rounded-md border-l-4 border-purple-500 bg-purple-500/10 p-3 text-sm text-slate-200">
        💡 Co se hodí jako důkaz: screenshot inzerátu, screenshot komunikace,
        potvrzení o platbě, faktura, e-mailová korespondence.
      </div>

      {/* Drop zone — visible only when room for more */}
      {canAddMore && (
        <label
          htmlFor="evidence_picker"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-busy={isProcessing}
          className={`flex min-h-[200px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
            isProcessing
              ? 'cursor-wait border-slate-700 bg-slate-900/40'
              : isDragOver
                ? 'cursor-pointer border-purple-500 bg-purple-500/10'
                : 'cursor-pointer border-slate-700 bg-slate-900/40 hover:border-purple-500 hover:bg-purple-500/5'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 size={32} className="animate-spin text-purple-400" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-200">
                Zpracovávám obrázky…
              </p>
              <p className="text-xs text-slate-500">
                Optimalizace pro rychlejší upload, počkej moment.
              </p>
            </>
          ) : (
            <>
              <Upload size={32} className="text-slate-400" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-200">
                Přetáhni soubory sem nebo klikni pro výběr
              </p>
              <p className="text-xs text-slate-500">
                Maximum {MAX_EVIDENCE_FILES} souborů. Velké obrázky se automaticky
                zoptimalizují. PDF max {limitMB} MB.
              </p>
            </>
          )}
          <input
            id="evidence_picker"
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handlePickerChange}
            disabled={isProcessing}
            className="hidden"
          />
        </label>
      )}

      {/* Error messages */}
      {fileErrors.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <ul className="space-y-1">
            {fileErrors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Compression feedback */}
      {compressionInfo.length > 0 && (
        <div
          className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 text-sm"
          aria-live="polite"
        >
          <p className="mb-1 font-medium text-cyan-300">
            ✓ Obrázky optimalizovány pro rychlejší upload
          </p>
          <ul className="space-y-0.5 text-xs text-cyan-200/80">
            {compressionInfo.map((info, idx) => (
              <li key={idx}>
                {info.name}: {formatFileSize(info.original)} → {formatFileSize(info.final)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Grid of uploaded files */}
      {fileCount > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {data.evidence_files.map((file, idx) => {
            const isImage = file.type.startsWith('image/')
            const previewUrl = previewUrls[idx]
            return (
              <div
                key={`${file.name}_${file.lastModified}_${idx}`}
                className="rounded-lg border border-slate-800 bg-slate-900/60 p-2"
              >
                <div className="relative aspect-square overflow-hidden rounded-md bg-slate-950/60">
                  {isImage && previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-300">
                      <FileText size={40} aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        PDF
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    aria-label={`Smazat soubor ${file.name}`}
                    className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-1.5 text-white shadow transition hover:bg-red-600"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2 space-y-0.5">
                  <p className="truncate text-xs font-medium text-slate-200" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500">{formatFileSize(file.size)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Progress / status */}
      <div className="text-xs" aria-live="polite">
        <span className="text-slate-400">
          {fileCount} / {MAX_EVIDENCE_FILES} souborů nahráno
        </span>
        {fileCount < MIN_EVIDENCE_FILES && (
          <span className="ml-2 text-red-400">
            Minimálně {MIN_EVIDENCE_FILES} soubory potřeba
          </span>
        )}
        {fileCount >= MIN_EVIDENCE_FILES && fileCount < MAX_EVIDENCE_FILES && (
          <span className="ml-2 text-emerald-400">✓ Dostatečně důkazů</span>
        )}
        {fileCount === MAX_EVIDENCE_FILES && (
          <span className="ml-2 text-emerald-400">✓ Maximum nahráno</span>
        )}
      </div>
    </div>
  )
}


// ── Step 5 — "Potvrzení" (souhrn + 3 konsenty) ──────

function formatCzechDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('cs-CZ', { year: 'numeric', month: 'long', day: 'numeric' })
}

const DESCRIPTION_PREVIEW_LIMIT = 200

interface Step5Props {
  data: FormData
  onChange: (patch: Partial<FormData>) => void
}

function Step5({ data, onChange }: Step5Props) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  const categoryLabel = data.category ? CATEGORY_LABELS[data.category] : '—'
  const platformLabel = data.platform ? PLATFORM_LABELS[data.platform] : '—'
  const severityLabel = data.severity ? SEVERITY_LABELS[data.severity] : '—'

  const descriptionTooLong = data.description.length > DESCRIPTION_PREVIEW_LIMIT
  const visibleDescription =
    descriptionTooLong && !descriptionExpanded
      ? data.description.slice(0, DESCRIPTION_PREVIEW_LIMIT) + '…'
      : data.description

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-emerald-300">
        <CheckCircle2 size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Potvrzení</h2>
      </div>
      <p className="text-sm text-slate-400">
        Zkontroluj údaje a potvrď tři souhlasy nutné pro zveřejnění nahlášení.
      </p>

      {/* ── Souhrn ────────────────────────────────── */}
      <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-white">Souhrn nahlášení</h3>

        {/* 1. Co se stalo */}
        <div className="border-l-2 border-purple-500/60 pl-3">
          <div className="mb-1.5 flex items-center gap-2 text-purple-300">
            <Shield size={14} aria-hidden="true" />
            <h4 className="text-xs font-semibold uppercase tracking-wide">Co se stalo</h4>
          </div>
          <dl className="space-y-1 text-sm text-slate-300">
            <SummaryRow label="Datum" value={formatCzechDate(data.incident_date)} />
            <SummaryRow
              label="Kategorie"
              value={
                data.category === 'other' && data.category_other.trim()
                  ? `${categoryLabel} — ${data.category_other.trim()}`
                  : categoryLabel
              }
            />
            <SummaryRow
              label="Platforma"
              value={
                data.platform === 'other' && data.platform_other.trim()
                  ? `${platformLabel} — ${data.platform_other.trim()}`
                  : platformLabel
              }
            />
            <SummaryRow label="Závažnost" value={severityLabel} />
          </dl>
        </div>

        {/* 2. O kom */}
        <div className="border-l-2 border-pink-500/60 pl-3">
          <div className="mb-1.5 flex items-center gap-2 text-pink-300">
            <AlertCircle size={14} aria-hidden="true" />
            <h4 className="text-xs font-semibold uppercase tracking-wide">O kom</h4>
          </div>
          <ul className="space-y-1 text-sm text-slate-300">
            {data.identifiers.map((item) => {
              const meta = IDENTIFIER_TYPE_META[item.type]
              const masked = item.value.trim() ? maskIdentifier(item.value, item.type) : '—'
              return (
                <li key={item.id} className="flex items-center gap-2">
                  <span aria-hidden="true">{meta.icon}</span>
                  <span className="text-slate-400">{meta.label}:</span>
                  <span className="font-mono text-slate-200">{masked}</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* 3. Detaily */}
        <div className="border-l-2 border-purple-500/60 pl-3">
          <div className="mb-1.5 flex items-center gap-2 text-purple-300">
            <AlertCircle size={14} aria-hidden="true" />
            <h4 className="text-xs font-semibold uppercase tracking-wide">Detaily</h4>
          </div>
          <dl className="space-y-1 text-sm text-slate-300">
            <SummaryRow
              label="Částka"
              value={`${data.amount_czk.toLocaleString('cs-CZ')} Kč`}
            />
            <div>
              <dt className="text-xs text-slate-500">Popis</dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-200">
                {visibleDescription}
              </dd>
              {descriptionTooLong && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded((s) => !s)}
                  className="mt-1 text-xs font-medium text-purple-300 hover:text-purple-200"
                >
                  {descriptionExpanded ? 'Skrýt' : 'Zobrazit celý popis'}
                </button>
              )}
            </div>
          </dl>
        </div>

        {/* 4. Důkazy */}
        <div className="border-l-2 border-cyan-500/60 pl-3">
          <div className="mb-1.5 flex items-center gap-2 text-cyan-300">
            <Upload size={14} aria-hidden="true" />
            <h4 className="text-xs font-semibold uppercase tracking-wide">Důkazy</h4>
          </div>
          <p className="text-sm text-slate-300">
            {data.evidence_files.length} {data.evidence_files.length === 1 ? 'soubor' : data.evidence_files.length >= 2 && data.evidence_files.length <= 4 ? 'soubory' : 'souborů'}
          </p>
          {data.evidence_files.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-slate-400">
              {data.evidence_files.map((f, i) => (
                <li key={`${f.name}_${f.lastModified}_${i}`} className="flex items-center gap-2">
                  <FileText size={12} aria-hidden="true" className="text-slate-500" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-slate-600">·</span>
                  <span>{formatFileSize(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 5. Příští kroky */}
        <div className="border-l-2 border-blue-500/60 pl-3">
          <div className="mb-1.5 flex items-center gap-2 text-blue-300">
            <Info size={14} aria-hidden="true" />
            <h4 className="text-xs font-semibold uppercase tracking-wide">Příští kroky</h4>
          </div>
          <p className="text-sm text-slate-400">
            Po odeslání projde nahlášení AI předkontrolou. Pokud poskytneš
            e-mail dotčené osoby (jeden z identifikátorů typu e-mail), bude
            informována a má 14 dní na vyjádření. Poté bude nahlášení
            zveřejněno v databázi.
          </p>
        </div>
      </section>

      {/* ── Konsenty ──────────────────────────────── */}
      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Souhlasy</h3>

        <ConsentRow
          checked={data.truth_confirmation}
          onChange={(v) => onChange({ truth_confirmation: v })}
        >
          Potvrzuji, že údaje, které jsem v tomto formuláři uvedl/a, jsou
          pravdivé a vycházejí z mé osobní zkušenosti. Beru na vědomí, že
          vědomě nepravdivé nahlášení může být klasifikováno jako pomluva
          podle § 184 trestního zákoníku.
        </ConsentRow>

        <ConsentRow
          checked={data.data_processing_consent}
          onChange={(v) => onChange({ data_processing_consent: v })}
        >
          Souhlasím se zpracováním osobních údajů podle GDPR za účelem
          ochrany veřejnosti před online podvody. Údaje budou uchovávány po
          dobu 5 let, poté budou anonymizovány nebo vymazány.
        </ConsentRow>

        <ConsentRow
          checked={data.law_enforcement_consent}
          onChange={(v) => onChange({ law_enforcement_consent: v })}
        >
          Souhlasím s tím, že provozovatel může předat moje identifikační
          údaje orgánům činným v trestním řízení na základě zákonné žádosti,
          nebo dotčené osobě v rámci uplatnění jejích práv (GDPR článek 15).
        </ConsentRow>
      </section>

      <p className="border-l-2 border-slate-600 pl-3 text-xs text-slate-400">
        Nahlášení vychází z tvé zkušenosti a zveřejňuješ ho na vlastní
        odpovědnost. Neklikni.cz neověřuje pravdivost jednotlivých údajů
        a neručí za ně. Za obsah nahlášení odpovídá výhradně nahlašující.
      </p>
    </div>
  )
}


interface SummaryRowProps {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <dt className="text-xs text-slate-500">{label}:</dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  )
}


interface ConsentRowProps {
  checked: boolean
  onChange: (next: boolean) => void
  children: ReactNode
}

function ConsentRow({ checked, onChange, children }: ConsentRowProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors hover:bg-slate-900/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-purple-600 focus:ring-2 focus:ring-purple-500/30"
      />
      <span className="text-sm text-slate-300">{children}</span>
    </label>
  )
}
