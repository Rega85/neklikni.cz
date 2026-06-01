'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'

const LS_KEY = 'referral_prompt_seen'
const SS_KEY = 'referral_prompt_session'
const COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000 // 5 dní

function canShow(): boolean {
  try {
    // Každá session ukáže max 1×
    if (sessionStorage.getItem(SS_KEY)) return false
    // Globální cooldown: nepokud vidět dřív než za 5 dní
    const ts = localStorage.getItem(LS_KEY)
    if (ts && Date.now() - Number(ts) < COOLDOWN_MS) return false
  } catch {
    // Private mode / storage blocked → dovolíme ukázat
  }
  return true
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SS_KEY, '1')
    localStorage.setItem(LS_KEY, String(Date.now()))
  } catch {}
}

export default function ReferralPopup() {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const close = useCallback(() => setCode(null), [])

  useEffect(() => {
    const handleTrigger = async () => {
      if (!canShow()) return

      try {
        const res = await fetch('/api/referral', { cache: 'no-store' })
        if (!res.ok) return // 401 pro anon uživatele → tiše ignorovat

        const data = (await res.json()) as { code?: string }
        if (!data?.code) return // přihlášený bez referral kódu (edge case)

        markSeen()
        setCode(data.code)
      } catch {
        // Síťová chyba → tichý fallback, popup se nezobrazí
      }
    }

    window.addEventListener('referralPromptTrigger', handleTrigger)
    return () => window.removeEventListener('referralPromptTrigger', handleTrigger)
  }, [])

  if (!code) return null

  const referralUrl = `https://www.neklikni.cz/register?ref=${code}`
  const waText = encodeURIComponent(
    `Ověřuji si podezřelé SMS a e-maily na NeKlikni.cz — AI to prověří za pár vteřin 🛡️ Zaregistruj se přes můj odkaz, je to zadarmo: ${referralUrl}`
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel — bottom-sheet na mobilu, centered modal na sm+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sdílení NeKlikni"
        className="fixed inset-x-0 bottom-0 z-[201] animate-fade-up px-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:px-4"
      >
        <div className="relative w-full max-w-md rounded-t-3xl border border-white/10 bg-slate-900 p-6 pb-8 shadow-2xl sm:rounded-3xl sm:pb-6">
          {/* X zavřít */}
          <button
            type="button"
            onClick={close}
            aria-label="Zavřít"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>

          {/* Drag handle (vizuální hint pro mobil) */}
          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden"
            aria-hidden="true"
          />

          <h2 className="pr-8 text-xl font-black tracking-tight text-white">
            Líbí se ti NeKlikni? Podej to dál 💜
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Pošli odkaz přátelům a rodině — chraň je před podvody.
            Za každého, kdo se zaregistruje, dostaneš{' '}
            <strong className="text-white">5 kreditů zdarma</strong>.
          </p>

          {/* Referral odkaz */}
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
            <span className="flex-1 truncate font-mono text-sm text-slate-300">
              neklikni.cz/register?ref={code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-purple-300 transition-colors hover:bg-white/5 hover:text-purple-200"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" /> Zkopírováno
                </>
              ) : (
                <>
                  <Copy size={13} /> Kopírovat
                </>
              )}
            </button>
          </div>

          {/* Sdílecí tlačítka */}
          <div className="mt-3 flex gap-2">
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
            >
              💬 WhatsApp
            </a>
            {/* Messenger: fb-messenger:// deep link funguje na iOS/Android;
                na desktopu bez Messenger aplikace tichý fallback */}
            <a
              href={`fb-messenger://share/?link=${encodeURIComponent(referralUrl)}`}
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0866FF] py-2.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-95"
            >
              💬 Messenger
            </a>
          </div>

          {/* Odmítnutí */}
          <button
            type="button"
            onClick={close}
            className="mt-4 w-full py-1 text-center text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            Teď ne
          </button>
        </div>
      </div>
    </>
  )
}
