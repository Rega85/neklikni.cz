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
