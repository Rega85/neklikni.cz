import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Chybí údaje" }, { status: 400 });
    }

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "menffisto@gmail.com",
      replyTo: email,
      subject: `Kontaktní formulář: ${name}`,
      html: `<p><strong>Jméno:</strong> ${name}</p><p><strong>E-mail:</strong> ${email}</p><p><strong>Zpráva:</strong><br/>${message}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}