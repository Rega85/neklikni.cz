import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { escapeHtml, getClientIp } from "../_lib/security";
import { checkRateLimit, hashForRL } from "../_lib/ratelimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.neklikni.cz";

const LEAD_RATE_LIMIT = 5; // per 1h per IP (Redis-backed)

// Whitelist přijatelných verzí znění souhlasu (LeadMagnet checkbox).
// Klient pošle aktuální verzi (LEAD_CONSENT_VERSION v LeadMagnet.tsx).
// "legacy" je rezervováno pro backfill v DB — nikdy se nesmí přijmout
// ze síťového vstupu.
const ACCEPTED_LEAD_CONSENT_VERSIONS: ReadonlySet<string> = new Set(["2026-05"]);

export const dynamic = "force-dynamic";

function unsubscribeUrl(token: string): string {
  return `${APP_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

function magnetEmailHtml(email: string, unsubscribeToken: string) {
  const link = `${APP_URL}/podvody-2026`;
  const unsubLink = unsubscribeUrl(unsubscribeToken);
  const safeEmail = escapeHtml(email);
  return `<!DOCTYPE html>
<html lang="cs"><head><meta charset="utf-8"><title>10 nejčastějších českých podvodů 2026</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;padding:24px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="padding:32px 32px 16px">
          <div style="font-size:14px;font-weight:800;color:#7c3aed;letter-spacing:0.1em;text-transform:uppercase">NeKlikni.cz</div>
          <h1 style="margin:16px 0 8px;font-size:28px;line-height:1.2;color:#0f172a;font-weight:900">10 nejčastějších českých podvodů 2026</h1>
          <p style="margin:0;color:#475569;font-size:15px;line-height:1.6">Děkujeme! Tady je tvůj přehled — reálné ukázky SMS, e-mailů a falešných webů, které kolovaly v Česku.</p>
        </td></tr>
        <tr><td style="padding:8px 32px 32px">
          <a href="${link}" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#3b82f6);color:#ffffff;text-decoration:none;font-weight:800;padding:14px 28px;border-radius:14px;font-size:15px">
            Otevřít přehled
          </a>
          <p style="margin:18px 0 0;color:#64748b;font-size:13px;line-height:1.6">
            Stránka se otevře v prohlížeči. Tlačítkem &bdquo;Stáhnout / vytisknout&ldquo; si ji můžeš uložit jako PDF nebo vytisknout.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">
          <p style="margin:0 0 8px;font-size:13px;color:#475569"><strong>Tip:</strong> Až ti přijde podezřelá SMS nebo e-mail, vlož ji na <a href="${APP_URL}" style="color:#7c3aed">neklikni.cz</a> — AI ti řekne do 3 sekund, jestli je to podvod.</p>
          <p style="margin:0 0 8px;font-size:12px;color:#94a3b8">Tento e-mail jsi obdržel(a), protože ses přihlásil(a) na ${safeEmail}.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8">Nechceš už další e-maily? <a href="${unsubLink}" style="color:#7c3aed">Odhlásit se</a> (jeden klik).</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipHash = await hashForRL(ip);
    const rl = await checkRateLimit(ipHash, 'lead', LEAD_RATE_LIMIT, '1 h');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Příliš mnoho požadavků. Zkuste to později." },
        { status: 429 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const source = String(body?.source ?? "homepage_pdf").slice(0, 64);
    const consent = body?.consent === true;
    const consentVersion = typeof body?.consent_version === "string" ? body.consent_version : "";

    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Neplatný e-mail" }, { status: 400 });
    }

    // GDPR čl. 7: souhlas musí být aktivní a doložitelný. Frontend gate ne-
    // stačí — server musí enforce, jinak by stačil curl pro insert bez souhlasu.
    if (!consent) {
      return NextResponse.json(
        { error: "Pro odeslání musíš odsouhlasit zpracování e-mailu." },
        { status: 400 }
      );
    }

    if (!ACCEPTED_LEAD_CONSENT_VERSIONS.has(consentVersion)) {
      return NextResponse.json(
        { error: "Neplatná verze znění souhlasu." },
        { status: 400 }
      );
    }

    // Vygeneruj token předem — pro nové leady jde do INSERTu, pro duplicitní
    // (23505) ho nahradíme tokenem z existujícího řádku přes SELECT.
    const generatedToken = crypto.randomUUID().replace(/-/g, "");
    const consentAt = new Date().toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from("leads")
      .insert({
        email,
        source,
        unsubscribe_token: generatedToken,
        consent: true,
        consent_at: consentAt,
        consent_version: consentVersion,
      });

    // 23505 = unique violation (already in DB) — treat as success and re-send email
    if (insertErr && insertErr.code !== "23505") {
      console.warn("Lead insert error:", insertErr.message);
      return NextResponse.json({ error: "Nepodařilo se uložit" }, { status: 500 });
    }

    // Po insertu (nebo při 23505) si vytáhni aktuální token a stav unsubscribed.
    // Token z DB bere přednost před generatedToken — duplicit může mít už dávno
    // vygenerovaný token z prvního insertu.
    let leadToken = generatedToken;
    let leadUnsubscribed = false;
    {
      const { data: leadRow, error: selectErr } = await supabaseAdmin
        .from("leads")
        .select("unsubscribe_token, unsubscribed")
        .eq("email", email)
        .eq("source", source)
        .maybeSingle();

      if (selectErr) {
        console.warn("Lead post-insert select failed:", selectErr.message);
      } else if (leadRow) {
        leadToken = leadRow.unsubscribe_token ?? generatedToken;
        leadUnsubscribed = leadRow.unsubscribed === true;
      }
    }

    // Send the lead-magnet email if Resend is configured. Failures are logged
    // but don't break the flow — the email is in DB and can be resent later.
    // Pokud lead je už odhlášený, e-mail NEPOSÍLAT (porušilo by to odvolání souhlasu).
    if (
      !leadUnsubscribed &&
      process.env.RESEND_API_KEY &&
      process.env.RESEND_FROM_EMAIL
    ) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const unsubLink = `${APP_URL}/api/unsubscribe?token=${encodeURIComponent(leadToken)}`;
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: email,
          subject: "10 nejčastějších českých podvodů 2026 — tvůj přehled",
          html: magnetEmailHtml(email, leadToken),
          headers: {
            // RFC 2369 — viditelné v hlavičkách, MUA z toho dělá tlačítko "Unsubscribe".
            "List-Unsubscribe": `<${unsubLink}>`,
            // RFC 8058 — souhlas s jednoklikovým POST, MUA na to neudělá redirect.
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
      } catch (e) {
        console.warn("Lead magnet email send failed:", e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Lead route error:", err);
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
