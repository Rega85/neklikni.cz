/**
 * Stepper — vizuální indikátor kroků formuláře.
 *
 * Props:
 *   - currentStep: aktuální krok (1-based)
 *   - totalSteps: celkový počet kroků
 *   - labels: textový popis každého kroku (délka === totalSteps)
 *
 * Vizuál:
 *   - Aktivní krok má glow + brand gradient
 *   - Dokončené kroky mají Check ikonu
 *   - Budoucí kroky jsou ztlumené
 */

'use client'

import { Check } from 'lucide-react'

interface StepperProps {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export function Stepper({ currentStep, totalSteps, labels }: StepperProps) {
  return (
    <nav
      aria-label="Postup formuláře"
      className="mb-8 flex w-full items-start justify-between gap-1 sm:gap-2"
    >
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isDone = step < currentStep
        const label = labels[i] ?? `Krok ${step}`

        return (
          <div
            key={step}
            className="flex flex-1 flex-col items-center gap-2 text-center"
            aria-current={isActive ? 'step' : undefined}
          >
            <div
              className={[
                'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition-all sm:h-10 sm:w-10 sm:text-sm',
                isActive &&
                  'border-purple-400/60 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-[0_0_24px_-4px_rgba(168,85,247,0.7)] animate-pulse-soft',
                isDone &&
                  'border-purple-400/40 bg-purple-500/20 text-purple-200',
                !isActive && !isDone && 'border-slate-700 bg-slate-900/60 text-slate-500',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isDone ? <Check size={16} aria-hidden="true" /> : step}
            </div>
            <span
              className={[
                'text-[10px] font-medium leading-tight sm:text-xs',
                isActive ? 'text-slate-100' : 'text-slate-500',
              ].join(' ')}
            >
              {label}
            </span>
          </div>
        )
      })}
    </nav>
  )
}
