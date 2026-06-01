'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import Link from 'next/link'

interface Props {
  /** null = ještě se načítá auth stav → nic nezobrazit */
  isLoggedIn: boolean | null
}

export default function ReferralCard({ isLoggedIn }: Props) {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) return
    fetch('/api/referral', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { code?: string } | null) => { if (d?.code) setCode(d.code) })
      .catch(() => {})
  }, [isLoggedIn])

  // Přeskočit celý render dokud nevíme stav přihlášení
  if (isLoggedIn === null) return null

  const referralUrl = code ? `https://www.neklikni.cz/register?ref=${code}` : null
  const waText = referralUrl
    ? encodeURIComponent(
        `Doporučuji NeKlikni.cz — prověří podezřelou SMS nebo e-mail za pár vteřin 🛡️ Zaregistruj se přes můj odkaz: ${referralUrl}`
      )
    : null

  const handleCopy = async () => {
    if (!referralUrl) return
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto w-full rounded-[32px] border border-emerald-800/40 bg-emerald-950/30 p-6 sm:p-8 text-left space-y-4">
      {/* Záhlaví */}
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none select-none" aria-hidden="true">🎁</span>
        <div className="space-y-1">
          {isLoggedIn ? (
            <>
              <h3 className="text-lg font-black text-white">
                Pozvi přátele a získej analýzy navíc
              </h3>
              <p className="text-sm text-slate-300">
                Za každého, kdo se zaregistruje přes tvůj odkaz, dostaneš{' '}
                <strong className="text-white">5 analýz zdarma</strong>.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-black text-white">
                Zaregistruj se a získej analýzy za přátele
              </h3>
              <p className="text-sm text-slate-300">
                Po registraci dostaneš vlastní referral odkaz. Za každého přítele,
                kdo se přes něj přihlásí, dostaneš{' '}
                <strong className="text-white">5 analýz zdarma</strong>.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Referral odkaz + kopírovat — jen pro přihlášené s načteným kódem */}
      {isLoggedIn && code && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-3">
          <span className="flex-1 truncate font-mono text-sm text-slate-300">
            neklikni.cz/register?ref={code}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-300 transition-colors hover:text-emerald-200"
          >
            {copied ? (
              <><Check size={13} /> Zkopírováno</>
            ) : (
              <><Copy size={13} /> Kopírovat</>
            )}
          </button>
        </div>
      )}

      {/* Sdílecí tlačítka */}
      {isLoggedIn && referralUrl && waText && (
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
          >
            💬 WhatsApp
          </a>
          <a
            href={`fb-messenger://share/?link=${encodeURIComponent(referralUrl)}`}
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-[#0866FF] px-4 py-2 text-xs font-bold text-white transition-all hover:brightness-110 active:scale-95"
          >
            Messenger
          </a>
        </div>
      )}

      {/* Registrační CTA pro anonymní uživatele */}
      {!isLoggedIn && (
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-500 active:scale-95"
        >
          Zaregistrovat se zdarma →
        </Link>
      )}
    </div>
  )
}
