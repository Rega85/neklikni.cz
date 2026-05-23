import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Price IDs are read from env so live and test keys can coexist.
// Set these in Vercel (live) and .env.local (test):
//   STRIPE_PRICE_ONESHOT  — 49 Kč one-time, 1 prémiová PRO analýza
//   STRIPE_PRICE_BASIC    — 99 Kč/měs, 50 analýz
//   STRIPE_PRICE_PRO      — 199 Kč/měs, 150 analýz
type PlanConfig = { priceId: string | undefined; mode: "payment" | "subscription" };

const PRICES: Record<string, PlanConfig> = {
  oneshot: { priceId: process.env.STRIPE_PRICE_ONESHOT, mode: "payment" },
  basic:   { priceId: process.env.STRIPE_PRICE_BASIC,   mode: "subscription" },
  pro:     { priceId: process.env.STRIPE_PRICE_PRO,     mode: "subscription" },
};

type Plan = keyof typeof PRICES;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { plan } = (await req.json()) as { plan?: string };

    if (!plan || !(plan in PRICES) || !PRICES[plan as Plan].priceId) {
      return NextResponse.json({ error: "Neplatný nebo nedostupný plán" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {}
          },
        },
      }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "Musíš být přihlášený" }, { status: 401 });
    }

    // Server-controlled URL only — never trust the Origin header here, since
    // an attacker can hit this endpoint from evil.com and steal session_id
    // via a redirect to their domain.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const selected = PRICES[plan as Plan];
    if (!selected.priceId) {
      return NextResponse.json({ error: "Plán není v Stripe nakonfigurován" }, { status: 503 });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{ price: selected.priceId, quantity: 1 }],
      mode: selected.mode,
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.warn("Checkout error:", error);
    return NextResponse.json({ error: "Chyba při vytváření platby" }, { status: 500 });
  }
}