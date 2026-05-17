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

import { useCallback, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
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
  detectIdentifierType,
  normalizeAccount,
  normalizeEmail,
  normalizeFacebookUrl,
  normalizePhone,
  normalizeVarSymbol,
} from '@/utils/databaze/identifiers'
import { Stepper } from './components/Stepper'

const TOTAL_STEPS = 5

const STEP_LABELS = ['Co se stalo?', 'O kom?', 'Detaily', 'Důkazy', 'Potvrzení']

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

function isStepValid(step: number, data: FormData): boolean {
  if (step === 1) return isStep1Valid(data)
  if (step === 2) return isStep2Valid(data)
  if (step === 3) return isStep3Valid(data)
  // Steps 4-5 jsou placeholdery, validace přijde s naplněním obsahu.
  return true
}


// ── Hlavní komponenta ────────────────────────────────

export function IncidentReportForm() {
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)

  function updateFormData(patch: Partial<FormData>) {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  function goNext() {
    setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  function handleSubmit() {
    // TODO: real submit logic — POST multipart/form-data to /api/databaze/report
    console.warn('IncidentReportForm submit — not implemented yet (scaffold).')
  }

  const canProceed = isStepValid(currentStep, formData)

  return (
    <section className="surface-card-elevated animate-fade-up rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 backdrop-blur-md sm:p-8">
      <Stepper currentStep={currentStep} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />

      <div className="min-h-[280px]">
        {currentStep === 1 && <Step1 data={formData} onChange={updateFormData} />}
        {currentStep === 2 && <Step2 data={formData} onChange={updateFormData} />}
        {currentStep === 3 && <Step3 data={formData} onChange={updateFormData} />}
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
            disabled={!canProceed}
            className="brand-gradient rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            Další
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed}
            className="brand-gradient rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            Odeslat nahlášení
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
          value={Number.isFinite(data.amount_czk) ? data.amount_czk : 0}
          onChange={(e) => {
            const parsed = Math.floor(Number(e.target.value))
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
