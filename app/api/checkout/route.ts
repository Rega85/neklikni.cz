import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { PLAN_CONFIG, isPlanKey } from "../_lib/billingPlans";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Price IDs are read from env so live and test keys can coexist — viz
// PLAN_CONFIG v ../_lib/billingPlans.ts pro přesné názvy proměnných.
// Nastavit v Vercel (live) a .env.local (test):
//   STRIPE_PRICE_ONESHOT       — 49 Kč jednorázová analýza
//   STRIPE_PRICE_FULL_MONTHLY  — 79 Kč/měs, neomezené (fair use), 7denní trial
//   STRIPE_PRICE_FULL_YEARLY   — 790 Kč/rok, neomezené (fair use), 7denní trial

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { plan } = (await req.json()) as { plan?: string };

    if (!plan || !isPlanKey(plan)) {
      return NextResponse.json({ error: "Neplatný nebo nedostupný plán" }, { status: 400 });
    }
    const priceId = process.env[PLAN_CONFIG[plan].envVar];
    if (!priceId) {
      return NextResponse.json({ error: "Plán není v Stripe nakonfigurován" }, { status: 503 });
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

    const selected = PLAN_CONFIG[plan];

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: selected.mode,
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?canceled=true`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan },
      ...(selected.mode === "subscription" && selected.trialDays
        ? { subscription_data: { trial_period_days: selected.trialDays, metadata: { user_id: user.id, plan } } }
        : {}),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.warn("Checkout error:", error);
    return NextResponse.json({ error: "Chyba při vytváření platby" }, { status: 500 });
  }
}