'use client'

/**
 * Nevratné smazání subjektu. Podmínka od Pavla: potvrzovací dialog
 * vyžaduje PŘESNÉ opsání maskovaného identifikátoru (ne jen "opravdu
 * smazat?") — mazání je nevratné, tlačítko samo je moc slabá pojistka.
 * Server-side stejnou hodnotu znovu ověřuje (viz
 * app/api/admin/subjekty/route.ts) — tohle je jen UX, ne autorita.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'

interface Props {
  subjectId: string
  /** Maskovaná hodnota, kterou musí admin přesně opsat (první identifikátor subjektu). */
  confirmValue: string
}

export function DeleteSubjectDialog({ subjectId, confirmValue }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = typed.trim() === confirmValue

  async function handleDelete() {
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/subjekty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, action: 'delete', confirmText: typed.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || 'Smazání se nezdařilo.')
      }
      router.push('/admin/subjekty')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba.')
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/25 transition-all"
      >
        <Trash2 size={14} /> Smazat subjekt
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-red-300">
          <AlertTriangle size={14} /> Nevratné smazání
        </p>
        <button
          onClick={() => {
            setOpen(false)
            setTyped('')
            setError(null)
          }}
          className="text-slate-500 hover:text-slate-300"
          title="Zrušit"
        >
          <X size={16} />
        </button>
      </div>
      <p className="mt-2 text-xs text-red-200/80">
        Smaže se subjekt, všechny jeho identifikátory, nahlášení a nahrané důkazy (soubory i DB
        záznamy). Nejde vrátit zpět. Pro potvrzení opiš přesně:
      </p>
      <p className="mt-2 rounded-lg bg-slate-950/60 px-3 py-1.5 font-mono text-sm text-slate-100 select-all">
        {confirmValue}
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="Opiš identifikátor přesně…"
        className="mt-2 w-full rounded-lg border border-red-500/30 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleDelete}
          disabled={!canSubmit || loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Nevratně smazat
        </button>
      </div>
    </div>
  )
}
