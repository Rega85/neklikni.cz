import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICES = {
  easy: {
    priceId: "price_1T1whDBCHNo2zYHXNIU912Vl",
    mode: "payment" as const,
  },
  basic: {
    priceId: "price_1T1whYBCHNo2zYHXq0nQ3GJ7",
    mode: "subscription" as const,
  },
  pro: {
    priceId: "price_1T1wi8BCHNo2zYHXH5xDjwwm",
    mode: "subscription" as const,
  },
};

export async function POST(req: Request) {
  try {
    const { plan } = await req.json();

    if (!plan || !PRICES[plan as keyof typeof PRICES]) {
      return NextResponse.json({ error: "Neplatný plán" }, { status: 400 });
    }

    // Ověř přihlášení
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Musíš být přihlášený" }, { status: 401 });
    }

    const selected = PRICES[plan as keyof typeof PRICES];

    const session = await getStripe().checkout.sessions.create({
      customer_email: user.email,
      line_items: [{ price: selected.priceId, quantity: 1 }],
      mode: selected.mode,
      success_url: `${req.headers.get("origin")}/?success=true`,
      cancel_url: `${req.headers.get("origin")}/?canceled=true`,
      metadata: {
        user_id: user.id,
        plan: plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Chyba při vytváření platby" }, { status: 500 });
  }
}