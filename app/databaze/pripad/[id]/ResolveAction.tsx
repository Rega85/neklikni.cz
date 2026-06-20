'use client'

/**
 * Tlačítka pro vlastníka nahlášení: "Vyřešeno smírně" / "Stažené/chybné".
 * Viditelné jen autorovi nahlášení (kontrola na serveru v page.tsx).
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { IncidentResolutionStatus } from '@/types/databaze'

interface Props {
  incidentId: string
  resolutionStatus: IncidentResolutionStatus
}

export function ResolveAction({ incidentId, resolutionStatus }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resolve(status: 'resolved_amicably' | 'withdrawn') {
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/databaze/incident/${incidentId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_status: status }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Nepodařilo se uložit změnu.')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodařilo se uložit změnu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (resolutionStatus !== 'active') {
    return null
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4">
      <p className="mb-3 text-sm font-medium text-foreground">
        Je tohle nahlášení už vyřešené?
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => resolve('resolved_amicably')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-2 text-sm font-medium text-success ring-1 ring-success/40 transition hover:bg-success/25 disabled:opacity-50"
        >
          <CheckCircle2 size={14} aria-hidden="true" />
          Vyřešeno smírně
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => resolve('withdrawn')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive ring-1 ring-destructive/40 transition hover:bg-destructive/25 disabled:opacity-50"
        >
          <XCircle size={14} aria-hidden="true" />
          Stažené / chybné
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
