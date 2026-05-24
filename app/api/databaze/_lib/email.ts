/**
 * Outbound email pro databázi nahlášení.
 *
 * Best-effort: pokud RESEND_API_KEY chybí nebo Resend selže, funkce
 * jen loguje a vrací false — volající nesmí na tomto selhání nikdy
 * shodit původní request.
 */

import { Resend } from 'resend'

const FROM = 'Neklikni.cz <noreply@neklikni.cz>'

function buildReporterConfirmationHtml(incidentId: string): string {
  return `<!doctype html>
<html lang="cs">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.55; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p>Ahoj,</p>
    <p>přijali jsme tvé nahlášení a posíláme potvrzení.</p>
    <p><strong>Číslo nahlášení:</strong> ${incidentId}</p>
    <p>Co se děje teď: tvé nahlášení prochází automatickou předkontrolou a posouzením. Než se případně zveřejní, dotčená osoba může dostat příležitost se k němu vyjádřit.</p>
    <p>Připomínáme, že za pravdivost a úplnost údajů odpovídáš ty jako nahlašující. Uváděj prosím pouze fakta, která jsi schopen doložit.</p>
    <p>Díky, že pomáháš chránit ostatní.<br/>Tým Neklikni.cz</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 12px; color: #6b7280;">(Tento email je automatické potvrzení, neodpovídej na něj.)</p>
  </body>
</html>`
}

export async function sendReporterConfirmation(
  to: string,
  incidentId: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(
      'sendReporterConfirmation: RESEND_API_KEY missing — skipping email for incident',
      incidentId,
    )
    return false
  }
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Tvé nahlášení jsme přijali (ID: ${incidentId})`,
      html: buildReporterConfirmationHtml(incidentId),
    })
    return true
  } catch (err) {
    console.error(
      'sendReporterConfirmation failed for incident',
      incidentId,
      err,
    )
    return false
  }
}


interface AdminIncidentSummary {
  incidentId: string
  status: string
  category: string
  severity: string
  aiConfidence: number | null
  descriptionExcerpt: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildAdminNotificationHtml(s: AdminIncidentSummary, queueUrl: string): string {
  return `<!doctype html>
<html lang="cs">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.55; max-width: 600px; margin: 0 auto; padding: 24px;">
    <h2 style="margin: 0 0 12px;">Nové nahlášení čeká na schválení</h2>
    <p><strong>Incident ID:</strong> <code>${escapeHtml(s.incidentId)}</code></p>
    <table cellpadding="6" style="border-collapse: collapse; margin: 12px 0; font-size: 14px;">
      <tr><td style="color:#6b7280;">Status</td><td><strong>${escapeHtml(s.status)}</strong></td></tr>
      <tr><td style="color:#6b7280;">Kategorie</td><td>${escapeHtml(s.category)}</td></tr>
      <tr><td style="color:#6b7280;">Závažnost</td><td>${escapeHtml(s.severity)}</td></tr>
      <tr><td style="color:#6b7280;">AI confidence</td><td>${s.aiConfidence !== null ? s.aiConfidence + '/100' : '—'}</td></tr>
    </table>
    <p style="margin: 12px 0 4px; color:#6b7280; font-size:13px;">Popis (úryvek):</p>
    <blockquote style="margin: 0 0 16px; padding: 8px 12px; border-left: 3px solid #a78bfa; background:#f5f3ff; color:#1f2937; font-size: 13px;">${escapeHtml(s.descriptionExcerpt)}</blockquote>
    <p>
      <a href="${queueUrl}" style="display:inline-block; background:#7c3aed; color:#fff; text-decoration:none; padding:10px 18px; border-radius:8px; font-weight:600;">Otevřít moderační frontu</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 12px; color: #6b7280;">(Automatická notifikace o novém záznamu v moderační frontě.)</p>
  </body>
</html>`
}

function buildReporterRejectedHtml(incidentId: string, reason: string): string {
  const safeReason = escapeHtml(reason)
  return `<!doctype html>
<html lang="cs">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.55; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p>Ahoj,</p>
    <p>Tvoje nahlášení <strong>nebylo zveřejněno</strong>.</p>
    <p><strong>Číslo nahlášení:</strong> ${escapeHtml(incidentId)}</p>
    <p style="margin: 12px 0 4px; color:#6b7280; font-size:13px;">Důvod:</p>
    <blockquote style="margin: 0 0 16px; padding: 8px 12px; border-left: 3px solid #ef4444; background:#fef2f2; color:#1f2937;">${safeReason}</blockquote>
    <p>Pokud si myslíš, že rozhodnutí bylo chybné, můžeš nás kontaktovat — odpovíme.</p>
    <p>Tým Neklikni.cz</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 12px; color: #6b7280;">(Tento e-mail je automatický.)</p>
  </body>
</html>`
}

function buildReporterNeedsInfoHtml(incidentId: string, note: string): string {
  const safeNote = escapeHtml(note)
  return `<!doctype html>
<html lang="cs">
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.55; max-width: 560px; margin: 0 auto; padding: 24px;">
    <p>Ahoj,</p>
    <p>Tvoje nahlášení <strong>potřebuje doplnit</strong>, než ho budeme moci posoudit.</p>
    <p><strong>Číslo nahlášení:</strong> ${escapeHtml(incidentId)}</p>
    <p style="margin: 12px 0 4px; color:#6b7280; font-size:13px;">Co máme doplnit:</p>
    <blockquote style="margin: 0 0 16px; padding: 8px 12px; border-left: 3px solid #f59e0b; background:#fffbeb; color:#1f2937;">${safeNote}</blockquote>
    <p>Podej prosím upravené nahlášení s doplněnými údaji a/nebo důkazy.</p>
    <p>Díky,<br/>tým Neklikni.cz</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 12px; color: #6b7280;">(Tento e-mail je automatický.)</p>
  </body>
</html>`
}

export async function sendReporterIncidentRejected(
  to: string,
  incidentId: string,
  reason: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('sendReporterIncidentRejected: RESEND_API_KEY missing')
    return false
  }
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Tvé nahlášení nebylo zveřejněno (ID: ${incidentId})`,
      html: buildReporterRejectedHtml(incidentId, reason),
    })
    return true
  } catch (err) {
    console.error('sendReporterIncidentRejected failed:', err)
    return false
  }
}

export async function sendReporterIncidentNeedsInfo(
  to: string,
  incidentId: string,
  note: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('sendReporterIncidentNeedsInfo: RESEND_API_KEY missing')
    return false
  }
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Tvé nahlášení potřebuje doplnit (ID: ${incidentId})`,
      html: buildReporterNeedsInfoHtml(incidentId, note),
    })
    return true
  } catch (err) {
    console.error('sendReporterIncidentNeedsInfo failed:', err)
    return false
  }
}


export async function sendAdminNewIncidentNotification(
  summary: AdminIncidentSummary,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.ADMIN_NOTIFY_EMAIL
  if (!apiKey || !to) {
    console.warn(
      'sendAdminNewIncidentNotification: RESEND_API_KEY or ADMIN_NOTIFY_EMAIL missing — skipping',
    )
    return false
  }
  const queueUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.neklikni.cz'}/admin/moderace`
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM,
      to,
      subject: `[Neklikni admin] Nové nahlášení k posouzení (${summary.incidentId.slice(0, 8)})`,
      html: buildAdminNotificationHtml(summary, queueUrl),
    })
    return true
  } catch (err) {
    console.error('sendAdminNewIncidentNotification failed:', err)
    return false
  }
}
