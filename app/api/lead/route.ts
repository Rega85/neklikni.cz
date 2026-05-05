import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const source = String(body?.source ?? "homepage_pdf").slice(0, 64);

    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Neplatný e-mail" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("leads")
      .insert({ email, source });

    // 23505 = unique violation (already in DB) — treat as success
    if (error && error.code !== "23505") {
      console.warn("Lead insert error:", error.message);
      return NextResponse.json({ error: "Nepodařilo se uložit" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Lead route error:", err);
    return NextResponse.json({ error: "Chyba serveru" }, { status: 500 });
  }
}
