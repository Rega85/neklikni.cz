/**
 * Loading state pro /databaze/nahlasit.
 * Zobrazí se během auth/SSR fáze.
 */

import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <main
      className="min-h-screen bg-[#020617] text-slate-100"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={48}
            className="animate-spin text-purple-400"
            aria-hidden="true"
          />
          <p className="text-sm text-slate-400">Načítám formulář…</p>
        </div>
      </div>
    </main>
  )
}
