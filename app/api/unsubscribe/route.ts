import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Stejná HTML stránka pro libovolný výsledek (existující token, neznámý
// token, již odhlášený). Neprozrazujeme existenci e-mailu v DB.
const PAGE_HTML = `<!DOCTYPE html>
<html lang="cs"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Odhlášeno — NeKlikni.cz</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#020617;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{max-width:520px;width:100%;background:#0f172a;border:1px solid rgba(148,163,184,0.15);border-radius:16px;padding:32px;text-align:center}
  .brand{font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;background:linear-gradient(90deg,#a78bfa,#60a5fa);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:16px}
  h1{margin:0 0 12px;font-size:24px;line-height:1.25;color:#f8fafc;font-weight:800}
  p{margin:0 0 12px;font-size:15px;line-height:1.6;color:#cbd5e1}
  a.home{display:inline-block;margin-top:16px;color:#a78bfa;text-decoration:none;font-weight:600;font-size:14px}
  a.home:hover{color:#c4b5fd}
</style>
</head><body>
  <div class="card">
    <div class="brand">NeKlikni.cz</div>
    <h1>Byl/a jsi odhlášen/a.</h1>
    <p>Z této adresy ti už nepřijde žádný e-mail s tipy ani lead-magnet PDF.</p>
    <p>Pokud jsi odkaz otevřel/a omylem, stačí si znovu vyžádat PDF na úvodní stránce.</p>
    <a class="home" href="https://www.neklikni.cz/">← Zpět na neklikni.cz</a>
  </div>
</body></html>`;

function htmlResponse() {
  return new NextResponse(PAGE_HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function handleUnsubscribe(token: string | null) {
  if (!token || token.length < 16 || token.length > 128) {
    return htmlResponse();
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseAdmin
      .from("leads")
      .update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() })
      .eq("unsubscribe_token", token)
      .eq("unsubscribed", false);
  } catch (err) {
    console.warn("Unsubscribe update failed:", err);
  }

  return htmlResponse();
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  return handleUnsubscribe(token);
}

// RFC 8058 one-click: MUA (Gmail, Apple Mail...) pošle POST bez těla,
// případně form-urlencoded "List-Unsubscribe=One-Click". Token bereme
// z query stringu — stejně jako u GET.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  return handleUnsubscribe(token);
}
