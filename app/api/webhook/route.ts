import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-01-28.clover",
  });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

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

    // Credit allocation per plan:
    //   oneshot — 1  (49 Kč premium one-shot, Opus model)
    //   easy    — 10 (legacy, for grandfathered test users)
    //   basic   — 50 (99 Kč/měs, Sonnet)
    //   pro     — 150 (199 Kč/měs, Opus)
    const addedCredits =
      plan === "pro"     ? 150 :
      plan === "basic"   ?  50 :
      plan === "oneshot" ?   1 :
      plan === "easy"    ?  10 : 0;

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("credits_remaining, tier")
      .eq("id", userId)
      .single();

    const currentCredits = profile?.credits_remaining ?? 0;
    const currentTier = profile?.tier;

    // One-time top-ups (oneshot, easy) preserve an existing paid subscription tier
    // so users don't get downgraded by buying a top-up.
    const isTopUp = plan === "oneshot" || plan === "easy";
    const tierToSet = isTopUp && currentTier && ["basic", "pro"].includes(currentTier)
      ? currentTier
      : plan;

    const { error: upsertError } = await supabaseAdmin
      .from("user_profiles")
      .upsert({
        id: userId,
        credits_remaining: (currentCredits || 0) + addedCredits,
        stripe_customer_id: session.customer as string,
        tier: tierToSet,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

    if (upsertError) {
      return NextResponse.json({ error: "DB Update failed" }, { status: 500 });
    }
  }

  // ==========================================
  // SCÉNÁŘ B: Měsíční obnova předplatného
  // ==========================================
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    if (invoice.billing_reason === "subscription_cycle" || invoice.billing_reason === "subscription_update") {
      const customerId = invoice.customer as string;

      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, credits_remaining, tier")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        // Subscription renewal — top up credits to monthly allowance.
        // Only pro/basic actually have subscriptions; other tiers shouldn't trigger renewal.
        const addedCredits = profile.tier === "pro" ? 150 : profile.tier === "basic" ? 50 : 0;

        const { error: renewError } = await supabaseAdmin
          .from("user_profiles")
          .update({
            credits_remaining: profile.credits_remaining + addedCredits,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        if (renewError) {
          return NextResponse.json({ error: "DB Update failed" }, { status: 500 });
        }
      }
    }
  }

  // ==========================================
  // SCÉNÁŘ C: Zrušení předplatného
  // ==========================================
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    const { error: cancelError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        tier: "free",
        credits_remaining: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId);

    if (cancelError) {
      return NextResponse.json({ error: "DB Update failed" }, { status: 500 });
    }
  }

  // ==========================================
  // SCÉNÁŘ D: Neúspěšná platba
  // ==========================================
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = invoice.customer as string;

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (profile) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (user?.email) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: user.email,
            subject: "Platba na NeKlikni.cz selhala",
            html: `<p>Dobrý den,</p><p>Nepodařilo se zpracovat vaši platbu na <strong>NeKlikni.cz</strong>. Zkontrolujte prosím platební údaje ve svém účtu a aktualizujte je, aby nedošlo k přerušení služby.</p><p>Tým NeKlikni.cz</p>`,
          });
        } catch (e) {
          console.warn("Failed to send payment failure email:", e);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
