import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const cookieStore = await cookies();
    
    // 3. Ověření uživatele přes cookies
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
    if (!user) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

    // 4. Vytažení Stripe ID zákazníka
    const { data: profile } = await adminSupabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "Nemáš aktivní předplatné" }, { status: 400 });
    }

    // 5. Server-controlled URL only — never trust the Origin header here,
    // since an attacker can hit this endpoint from evil.com and exfiltrate
    // the customer via a redirect to their domain.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 6. Vygenerování odkazu do Stripe Portálu
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Portal billingPortal.sessions.create failed:", msg, error);
    return NextResponse.json({ error: "Nepodařilo se otevřít Stripe portál. Zkus to prosím znovu." }, { status: 500 });
  }
}