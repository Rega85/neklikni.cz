'use client'

/**
 * Ruční skrytí/odkrytí subjektu — nezávislé na automatickém triggeru
 * (trg_incidents_refresh_subject_visibility), který řeší jen
 * active/removed podle existence kvalifikujícího incidentu. "Skrýt" tady
 * nastaví 'hidden_objection', což trigger nikdy nepřepíše (viz komentář
 * v app/api/admin/subjekty/route.ts) — pro případ, kdy admin chce
 * dočasně skrýt subjekt i s platným incidentem (např. probíhající
 * posouzení námitky).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

interface Props {
  subjectId: string
  visibilityStatus: string
}

export function SubjectVisibilityActions({ subjectId, visibilityStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isHidden = visibilityStatus === 'hidden_objection'

  async function toggle() {
    const action = isHidden ? 'unhide' : 'hide'
    const confirmMsg = isHidden
      ? 'Odkrýt tento subjekt? Znovu se objeví ve veřejném vyhledávání (pokud má kvalifikující incident).'
      : 'Skrýt tento subjekt z veřejného vyhledávání? Data zůstanou v databázi, jen se přestanou zobrazovat.'
    if (!window.confirm(confirmMsg)) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/subjekty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, action }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || 'Akce se nezdařila.')
      }
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={toggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold ring-1 transition-all disabled:opacity-50 ${
          isHidden
            ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40 hover:bg-emerald-500/25'
            : 'bg-amber-500/15 text-amber-300 ring-amber-500/40 hover:bg-amber-500/25'
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isHidden ? (
          <Eye size={14} />
        ) : (
          <EyeOff size={14} />
        )}
        {isHidden ? 'Odkrýt subjekt' : 'Skrýt subjekt'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
