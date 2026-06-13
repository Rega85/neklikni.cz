/**
 * Loading state pro /databaze/nahlasit.
 * Zobrazí se během auth/SSR fáze.
 */

import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <main
      className="min-h-screen"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={48}
            className="animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Načítám formulář…</p>
        </div>
      </div>
    </main>
  )
}
