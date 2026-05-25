'use client'

/**
 * Jeden řádek identifikátoru s tlačítkem "Odkrýt". Default zobrazuje
 * maskovanou hodnotu. Klik → POST /api/admin/reveal-identifier → plnou
 * hodnotu ukáže inline. Každé odkrytí se logguje server-side do audit_log.
 */

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { identifierLabel } from '@/utils/databaze/identifiers'
import type { IdentifierType } from '@/types/databaze'

interface Props {
  identifierId: string
  incidentId: string
  type: string
  valueMasked: string
}

export function RevealIdentifier({ identifierId, incidentId, type, valueMasked }: Props) {
  const label = identifierLabel(type as IdentifierType, valueMasked)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReveal() {
    if (revealed || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/reveal-identifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier_id: identifierId, incident_id: incidentId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { value: string }
      setRevealed(data.value)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba')
    } finally {
      setLoading(false)
    }
  }

  function handleHide() {
    setRevealed(null)
    setError(null)
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-xs">
      <span className="text-slate-400">{label}:</span>
      <span className="font-mono text-slate-200">{revealed ?? valueMasked}</span>
      {revealed ? (
        <button
          type="button"
          onClick={handleHide}
          className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-white"
          title="Skrýt zpět"
        >
          <EyeOff size={11} /> Skrýt
        </button>
      ) : (
        <button
          type="button"
          onClick={handleReveal}
          disabled={loading}
          className="ml-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-purple-300 hover:text-purple-200 disabled:opacity-60"
          title="Odkrýt plnou hodnotu (zaloguje se)"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
          Odkrýt
        </button>
      )}
      {error && <span className="text-red-400 text-[10px]">· {error}</span>}
    </span>
  )
}
