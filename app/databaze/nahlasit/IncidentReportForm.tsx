/**
 * IncidentReportForm — klientská komponenta formuláře nahlášení.
 *
 * KOSTRA — pro Prompt 6.
 * Vnitřek jednotlivých kroků se doplní v další iteraci (Pavlův návrat).
 *
 * Co kostra obsahuje:
 *   - useState pro currentStep (1-5)
 *   - 5 placeholder sekcí (každá s heading + TODO komentář)
 *   - Stepper indikátor nahoře
 *   - Tlačítka Zpět / Další / Odeslat (na step 5)
 *   - Glass-morphism kontejner v brand stylu
 *
 * Co kostra zatím NEMÁ:
 *   - Žádný state pro form data
 *   - Žádné validace
 *   - Žádné API volání
 *   - Žádný drag&drop
 */

'use client'

import { useState } from 'react'
import { Shield, AlertCircle, Upload, CheckCircle2 } from 'lucide-react'
import { Stepper } from './components/Stepper'

const TOTAL_STEPS = 5

const STEP_LABELS = ['Co se stalo?', 'O kom?', 'Detaily', 'Důkazy', 'Potvrzení']

export function IncidentReportForm() {
  const [currentStep, setCurrentStep] = useState<number>(1)

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  function goNext() {
    setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  function handleSubmit() {
    // TODO: real submit logic — POST multipart/form-data to /api/databaze/report
    // (Pavlův návrat: napojit form data state, validaci, file upload)
    console.warn('IncidentReportForm submit — not implemented yet (scaffold).')
  }

  return (
    <section className="surface-card-elevated animate-fade-up rounded-2xl border border-slate-800/80 bg-slate-950/60 p-6 backdrop-blur-md sm:p-8">
      <Stepper currentStep={currentStep} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />

      <div className="min-h-[280px]">
        {currentStep === 1 && <Step1Placeholder />}
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
            className="brand-gradient rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)]"
          >
            Další
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="brand-gradient rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-[0_0_18px_-4px_rgba(168,85,247,0.6)] transition hover:shadow-[0_0_24px_-2px_rgba(236,72,153,0.7)]"
          >
            Odeslat nahlášení
          </button>
        )}
      </div>
    </section>
  )
}


// ── Placeholder kroky ────────────────────────────────
// Každý krok = heading + krátký popis + TODO komentář.
// V další iteraci sem přijde vlastní form UI.

function Step1Placeholder() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-purple-300">
        <Shield size={18} aria-hidden="true" />
        <h2 className="text-lg font-semibold text-slate-100">Co se stalo?</h2>
      </div>
      <p className="text-sm text-slate-400">
        Vyber kategorii incidentu, závažnost, datum a platformu.
      </p>
      {/* TODO: kategorie (IncidentCategory), severity (IncidentSeverity),
          incident_date (date input), platform (IncidentPlatform).
          + volitelné "platform_other" / "category_other" textová pole. */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
        Placeholder — formulářová pole se doplní v další iteraci.
      </div>
    </div>
  )
}


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
