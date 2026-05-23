import { NextResponse } from "next/server";
import { Resend } from "resend";
import { checkIpRateLimit, escapeHtml, getClientIp } from "../_lib/security";

const CONTACT_RATE_LIMIT = 3;
const CONTACT_RATE_WINDOW_MS = 60 * 60 * 1000; // 1h

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!checkIpRateLimit(ip, "contact", CONTACT_RATE_LIMIT, CONTACT_RATE_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Příliš mnoho požadavků. Zkuste to později." },
        { status: 429 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { name, email, message, website } = await req.json();

    // Honeypot: bots fill hidden fields, humans don't
    if (website) return NextResponse.json({ ok: true });

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Chybí údaje" }, { status: 400 });
    }

    if (typeof name !== "string" || name.length > 100) {
      return NextResponse.json({ error: "Jméno je příliš dlouhé." }, { status: 400 });
    }
    if (typeof email !== "string" || email.length > 200) {
      return NextResponse.json({ error: "E-mail je příliš dlouhý." }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Neplatný email." }, { status: 400 });
    }
    if (typeof message !== "string" || message.length > 5000) {
      return NextResponse.json({ error: "Zpráva je příliš dlouhá. Maximum je 5000 znaků." }, { status: 400 });
    }

    const toEmail = process.env.CONTACT_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!toEmail || !fromEmail) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br/>");

    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      // Subject is a plain-text header — don't HTML-escape, but strip newlines
      // to prevent header injection.
      subject: `Kontaktní formulář: ${name.replace(/[\r\n]/g, " ")}`,
      html: `<p><strong>Jméno:</strong> ${safeName}</p><p><strong>E-mail:</strong> ${safeEmail}</p><p><strong>Zpráva:</strong><br/>${safeMessage}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("Resend error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
