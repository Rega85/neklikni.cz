'use client'

import { useState } from 'react'
import { KeyRound, Check } from 'lucide-react'

interface Props {
  userId: string
  userEmail: string
}

export function PasswordResetButton({ userId, userEmail }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset() {
    if (!window.confirm(`Odeslat odkaz na obnovení hesla na adresu ${userEmail}?`)) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/uzivatele', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'reset_password' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || 'Reset selhal.')
      }
      setDone(true)
      setTimeout(() => setDone(false), 4000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Neznámá chyba.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleReset}
        disabled={loading || done}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition-all disabled:opacity-50 ${
          done
            ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40'
            : 'bg-amber-500/15 text-amber-300 ring-amber-500/40 hover:bg-amber-500/25'
        }`}
      >
        {loading ? (
          '…'
        ) : done ? (
          <><Check size={12} /> Odesláno</>
        ) : (
          <><KeyRound size={12} /> Reset hesla</>
        )}
      </button>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
