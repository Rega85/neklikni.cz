/**
 * Transakční e-maily pro předplatné (Stripe webhook), stejný vzor jako
 * app/api/databaze/_lib/email.ts — přímo přes Resend, best-effort
 * (nikdy nesmí shodit webhook handler, jen loguje a vrací false).
 */

import { Resend } from 'resend'

const FROM = 'Neklikni.cz <noreply@neklikni.cz>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.neklikni.cz'

async function dispatch(to: string, subject: string, html: string, context?: Record<string, unknown>): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email:billing] RESEND_API_KEY missing — skipping', context ?? {})
    return false
  }
  if (!to) {
    console.warn('[email:billing] empty recipient — skipping', context ?? {})
    return false
  }
  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({ from: FROM, to, subject, html })
    // Resend SDK v6 nevyhazuje chybu, vraci ji v result.error — bez tyhle
    // kontroly by se tichy fail ztratil (viz stejny komentar v databaze email.ts).
    if (result.error) {
      console.error('[email:billing] Resend API error', { to, ...context, error: result.error })
      return false
    }
    console.log('[email:billing] sent', { to, id: result.data?.id, ...context })
    return true
  } catch (err) {
    console.error('[email:billing] unexpected exception', { to, ...context, err })
    return false
  }
}

function formatCzechDate(d: Date): string {
  return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Připomínka konce zkušebního období — Stripe posílá
 * `customer.subscription.trial_will_end` 3 dny před koncem trialu.
 * Musí obsahovat: kdy trial končí, kolik a kdy se strhne, odkaz na
 * zrušení jedním klikem (přes /billing → Stripe portál — ne přímý
 * portálový odkaz, ten je jednorázový a expiruje, nedá se poslat
 * e-mailem předem).
 */
export async function sendTrialEndingReminder(
  to: string,
  trialEndDate: Date,
  priceLabel: string,
): Promise<boolean> {
  const cancelUrl = `${APP_URL}/billing`
  const html = `<!doctype html>
<html lang="cs">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.55; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p>Ahoj,</p>
    <p>Tvoje <strong>zkušební období NeKlikni.cz Full</strong> za pár dní končí.</p>
    <p style="margin: 12px 0 4px; color:#6b7280; font-size:13px;">Co se stane:</p>
    <blockquote style="margin: 0 0 16px; padding: 8px 12px; border-left: 3px solid #7c3aed; background:#f5f3ff; color:#1f2937;">
      Trial končí <strong>${formatCzechDate(trialEndDate)}</strong>. Poté se automaticky strhne <strong>${priceLabel}</strong> z platební karty, kterou jsi zadal/a při registraci.
    </blockquote>
    <p>Pokud chceš pokračovat, nemusíš nic dělat — předplatné se samo prodlouží. Pokud ne, zruš ho kdykoli jedním klikem, klidně i teď během trialu.</p>
    <p style="margin: 20px 0;">
      <a href="${cancelUrl}" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; padding:10px 18px; border-radius:8px; font-weight:600;">Spravovat / zrušit předplatné</a>
    </p>
    <p style="font-size: 13px; color:#6b7280;">Pokud tlačítko nefunguje, otevři tuto adresu: <br/><a href="${cancelUrl}">${cancelUrl}</a></p>
    <p>Díky,<br/>tým Neklikni.cz</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 12px; color: #6b7280;">(Tento e-mail je automatický — posíláme ho 3 dny před koncem každého zkušebního období.)</p>
  </body>
</html>`

  return dispatch(to, 'Tvůj zkušební přístup NeKlikni.cz brzy končí', html, {
    trialEndDate: trialEndDate.toISOString(),
    priceLabel,
  })
}
