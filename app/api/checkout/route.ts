import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const PRICES = {
  easy:  { priceId: "price_1T1whDBCHNo2zYHXNIU912Vl", mode: "payment" as const },
  basic: { priceId: "price_1T1whYBCHNo2zYHXq0nQ3GJ7", mode: "subscription" as const },
  pro:   { priceId: "price_1T1wi8BCHNo2zYHXH5xDjwwm", mode: "subscription" as const },
};

type Plan = keyof typeof PRICES;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const stripe = getStripe();
    const { plan } = (await req.json()) as { plan?: string };

    if (!plan || !(plan in PRICES)) {
      return NextResponse.json({ error: "Neplatný plán" }, { status: 400 });
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

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    const selected = PRICES[plan as Plan];

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [{ price: selected.priceId, quantity: 1 }],
      mode: selected.mode,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,  // ← opraveno
      cancel_url: `${origin}/pricing?canceled=true`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Chyba při vytváření platby" }, { status: 500 });
  }
}