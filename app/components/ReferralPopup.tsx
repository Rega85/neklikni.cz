'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'

const LS_KEY = 'referral_prompt_seen'
const SS_KEY = 'referral_prompt_session'
const COOLDOWN_MS = 5 * 24 * 60 * 60 * 1000 // 5 dní

function canShow(): boolean {
  try {
    if (sessionStorage.getItem(SS_KEY)) return false
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
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  // Zavření: nejdřív slide-out animace (300 ms), pak smazat z DOM
  const close = useCallback(() => {
    setVisible(false)
    setTimeout(() => setCode(null), 320)
  }, [])

  // Slide-in: spustí se až po nastavení code (dvojitý rAF = po paint)
  useEffect(() => {
    if (!code) return
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setVisible(true))
    )
    return () => cancelAnimationFrame(id)
  }, [code])

  // Escape klávesa pro zavření
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [visible, close])

  // Poslouchá globální event 'referralPromptTrigger'
  useEffect(() => {
    const handleTrigger = async () => {
      if (!canShow()) return
      try {
        const res = await fetch('/api/referral', { cache: 'no-store' })
        if (!res.ok) return // 401 = anon uživatel → ignorovat
        const data = (await res.json()) as { code?: string }
        if (!data?.code) return
        markSeen()
        setCode(data.code)
      } catch {
        // Síťová chyba → tichý fallback
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
    // Žádný backdrop — toast nezakrývá obsah stránky.
    // Mobil:   full-width pruh přilepený ke spodnímu okraji, slide-up z pod okraje
    // Desktop: kompaktní karta v pravém dolním rohu, jemný slide-up + fade
    <div
      role="region"
      aria-label="Referral nabídka"
      className={[
        'fixed z-[150]',
        // Pozice — mobil
        'bottom-0 left-0 right-0',
        // Pozice — desktop (přepíše mobil)
        'sm:bottom-4 sm:left-auto sm:right-4 sm:w-96',
        // Stylování
        'bg-slate-900',
        'border-t border-white/10',
        'sm:border sm:rounded-2xl',
        'shadow-[0_-4px_24px_rgba(0,0,0,0.4)] sm:shadow-2xl',
        // Animace (transition přes CSS, ne Tailwind keyframes)
        'transition-[transform,opacity] duration-300 ease-out',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full sm:translate-y-4 opacity-0 pointer-events-none',
      ].join(' ')}
    >
      {/* Drag handle — vizuální hint jen na mobilu */}
      <div
        className="mx-auto mt-3 mb-0 h-1 w-8 rounded-full bg-white/20 sm:hidden"
        aria-hidden="true"
      />

      {/* Header: text + zavřít */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 sm:pt-4">
        <div>
          <p className="text-sm font-black leading-snug text-white">
            Podej NeKlikni dál 💜
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            +5 kreditů za každého přítele, co se zaregistruje
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Zavřít"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={13} />
        </button>
      </div>

      {/* Akce: Kopírovat + WhatsApp + Messenger */}
      <div className="flex gap-2 px-4 pb-4 sm:pb-4">
        <button
          type="button"
          onClick={handleCopy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10 active:scale-95"
        >
          {copied ? (
            <><Check size={12} className="text-emerald-400" /> Zkopírováno</>
          ) : (
            <><Copy size={12} /> Kopírovat odkaz</>
          )}
        </button>
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Sdílet přes WhatsApp"
          className="flex items-center justify-center rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
        >
          💬 WA
        </a>
        {/* fb-messenger:// deep link — funguje na iOS/Android s Messenger app */}
        <a
          href={`fb-messenger://share/?link=${encodeURIComponent(referralUrl)}`}
          rel="noopener noreferrer"
          title="Sdílet přes Messenger"
          className="flex items-center justify-center rounded-xl bg-[#0866FF] px-3 py-2 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
        >
          MSG
        </a>
      </div>
    </div>
  )
}
