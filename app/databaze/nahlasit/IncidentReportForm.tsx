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

import { useState } from 'react'
import { Shield, AlertCircle, Upload, CheckCircle2 } from 'lucide-react'
import {
  CATEGORY_LABELS,
  PLATFORM_LABELS,
  SEVERITY_LABELS,
  type IncidentCategory,
  type IncidentPlatform,
  type IncidentSeverity,
} from '@/types/databaze'
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

interface FormData {
  // Step 1
  incident_date: string
  category: IncidentCategory | ''
  category_other: string
  platform: IncidentPlatform | ''
  platform_other: string
  severity: IncidentSeverity | ''
}

function initialFormData(): FormData {
  return {
    incident_date: new Date().toISOString().split('T')[0],
    category: '',
    category_other: '',
    platform: '',
    platform_other: '',
    severity: '',
  }
}


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

function isStepValid(step: number, data: FormData): boolean {
  if (step === 1) return isStep1Valid(data)
  // Steps 2-5 jsou placeholdery, validace přijde s naplněním obsahu.
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
        {currentStep === 2 && <Step2Placeholder />}
        {currentStep === 3 && <Step3Placeholder />}
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

function Step2Placeholder() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-pink-300">
        <AlertCircle size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">O kom?</h2>
      </div>
      <p className="text-sm text-slate-400">
        Zadej identifikátory protistrany (telefon, číslo účtu, e-mail, FB
        profil, variabilní symbol). Identifikátory normalizuje a hashuje server.
      </p>
      {/* TODO: dynamický seznam identifikátorů — pro každý typ + value,
          možnost přidat/odebrat řádek. Min 1.
          Plus volitelné pole "Kontakt na dotčenou osobu (pokud znáte)". */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
        Placeholder — pole pro identifikátory se doplní v další iteraci.
      </div>
    </div>
  )
}


function Step3Placeholder() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-purple-300">
        <AlertCircle size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Detaily</h2>
      </div>
      <p className="text-sm text-slate-400">
        Stručně popiš, co se stalo. 50–1000 znaků. Faktický tón, žádná osobní
        obvinění (viz pokyny u textového pole).
      </p>
      {/* TODO: textarea pro description (50-1000 char counter),
          amount_czk number input (0 - 100 000 000). */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
        Placeholder — popis a částka se doplní v další iteraci.
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
