import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
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

    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: `Kontaktní formulář: ${name}`,
      html: `<p><strong>Jméno:</strong> ${name}</p><p><strong>E-mail:</strong> ${email}</p><p><strong>Zpráva:</strong><br/>${message}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("Resend error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
