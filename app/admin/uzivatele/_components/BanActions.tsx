'use client'

import { useState } from 'react'
import { Ban, ShieldCheck } from 'lucide-react'

interface Props {
  userId: string
  isBanned: boolean
}

export function BanActions({ userId, isBanned: initialBanned }: Props) {
  const [banned, setBanned] = useState(initialBanned)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const confirm_msg = banned
      ? 'Odblokovat tohoto uživatele?'
      : 'Zablokovat tohoto uživatele? Nebude se moci přihlásit.'
    if (!window.confirm(confirm_msg)) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/uzivatele', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: banned ? 'unban' : 'ban' }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || 'Akce se nezdařila.')
      }
      setBanned(!banned)
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
        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition-all disabled:opacity-50 ${
          banned
            ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/40 hover:bg-emerald-500/25'
            : 'bg-red-500/15 text-red-300 ring-red-500/40 hover:bg-red-500/25'
        }`}
      >
        {loading
          ? '…'
          : banned
          ? <><ShieldCheck size={12} /> Odblokovat</>
          : <><Ban size={12} /> Zablokovat</>}
      </button>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
