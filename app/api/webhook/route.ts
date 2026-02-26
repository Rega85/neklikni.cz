import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ==========================================
  // IDEMPOTENCY CHECK — odmítnout duplikáty
  // event.id je unikátní per-delivery, Stripe ho mění při každém retryi
  // Stripe doporučuje právě tenhle přístup
  // ==========================================
  const { error: insertError } = await supabaseAdmin
    .from("processed_events")
    .insert({ event_id: event.id });

  if (insertError) {
    // unique_violation (23505) = event už byl zpracován, vrátíme 200 bez akce
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Jiná DB chyba — raději selžeme hlasitě (Stripe event zůstane v retry queue)
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // ==========================================
  // SCÉNÁŘ A: První nákup (checkout.session.completed)
  // ==========================================
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = (session.metadata?.plan || "pro").toLowerCase();

    if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

    const addedCredits = plan === "pro" ? 200 : plan === "basic" ? 50 : 10;

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("credits_remaining")
      .eq("id", userId)
      .single();

    const currentCredits = profile?.credits_remaining ?? 0;

    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        credits_remaining: currentCredits + addedCredits,
        stripe_customer_id: session.customer as string,
        tier: plan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Webhook: chyba při zápisu první platby:", updateError.message);
      return NextResponse.json({ error: "DB Update failed" }, { status: 500 });
    }
  }

  // ==========================================
  // SCÉNÁŘ B: Měsíční obnova předplatného
  // ==========================================
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    if (invoice.billing_reason === "subscription_cycle") {
      const customerId = invoice.customer as string;

      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, credits_remaining, tier")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        const addedCredits = profile.tier === "pro" ? 200 : profile.tier === "basic" ? 50 : 10;

        const { error: renewError } = await supabaseAdmin
          .from("user_profiles")
          .update({
            credits_remaining: profile.credits_remaining + addedCredits,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (renewError) {
          console.error("Webhook: chyba při obnově tarifu:", renewError.message);
          return NextResponse.json({ error: "DB Update failed" }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
