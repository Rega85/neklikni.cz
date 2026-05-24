'use client'

/**
 * Akční blok jednoho řádku moderace: 1× textarea + 3 submit tlačítka
 * (Schválit / Zamítnout / Vrátit k doplnění). Forma posílá `incident_id`,
 * `action` (z klikutého tlačítka přes `name=action value=...`), a `note`.
 *
 * Client-side validace zabrání submitu reject / needs_more_info bez
 * vyplněné poznámky — server stejnou kontrolu opakuje (force-fallback).
 */

import { useRef, useState } from 'react'
import { Check, MessageSquareWarning, X } from 'lucide-react'

interface Props {
  incidentId: string
}

export function ModerationActions({ incidentId }: Props) {
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const action = submitter?.value
    const note = noteRef.current?.value.trim() ?? ''

    if ((action === 'reject' || action === 'needs_more_info') && note.length < 3) {
      e.preventDefault()
      setError('Vyplň prosím důvod / poznámku (min. 3 znaky).')
      noteRef.current?.focus()
      return
    }
    setError(null)
    // Necháme browser submit (form action="/api/admin/moderace" method="POST").
  }

  return (
    <form
      action="/api/admin/moderace"
      method="POST"
      onSubmit={handleSubmit}
      className="mt-5 space-y-3"
    >
      <input type="hidden" name="incident_id" value={incidentId} />
      <textarea
        ref={noteRef}
        name="note"
        rows={2}
        maxLength={2000}
        placeholder="Důvod zamítnutí / co doplnit (povinné pro Zamítnout a Vrátit k doplnění)"
        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="action"
          value="approve"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/25"
        >
          <Check size={14} /> Schválit
        </button>
        <button
          type="submit"
          name="action"
          value="needs_more_info"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 ring-1 ring-amber-500/40 hover:bg-amber-500/25"
        >
          <MessageSquareWarning size={14} /> Vrátit k doplnění
        </button>
        <button
          type="submit"
          name="action"
          value="reject"
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/25"
        >
          <X size={14} /> Zamítnout
        </button>
      </div>
    </form>
  )
}
