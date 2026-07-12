import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { FULL_TIER_CREDIT_CEILING, isPlanKey, resolveTierAndCredits } from "../_lib/billingPlans";
import { sendTrialEndingReminder } from "../_lib/billingEmail";

function toIso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

// V API verzi 2026-01-28.clover žije current_period_end na subscription
// item (subscription může mít víc items s různými obdobími), ne přímo
// na Subscription — viz node_modules/stripe/types/SubscriptionItems.d.ts.
function getCurrentPeriodEnd(sub: Stripe.Subscription): number | null {
  return sub.items.data[0]?.current_period_end ?? null;
}

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
    const planRaw = (session.metadata?.plan || "").toLowerCase();

    if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });
    if (!isPlanKey(planRaw)) {
      console.warn("checkout.session.completed: unknown plan in metadata", planRaw);
      return NextResponse.json({ received: true, ignored: "unknown plan" });
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("credits_remaining, tier")
      .eq("id", userId)
      .single();

    const { tier, credits } = resolveTierAndCredits(planRaw, profile?.tier, profile?.credits_remaining ?? 0);

    const updatePayload: Record<string, unknown> = {
      id: userId,
      credits_remaining: credits,
      stripe_customer_id: session.customer as string,
      tier,
      updated_at: new Date().toISOString(),
    };

    // full_monthly/full_yearly = skutecne Stripe predplatne s trialem —
    // dotahni aktualni stav primo ze Subscription objektu (checkout
    // session sama o sobe trial_end/current_period_end neobsahuje).
    if ((planRaw === "full_monthly" || planRaw === "full_yearly") && session.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        updatePayload.stripe_subscription_id = sub.id;
        updatePayload.subscription_status = sub.status;
        updatePayload.trial_end = toIso(sub.trial_end);
        updatePayload.current_period_end = toIso(getCurrentPeriodEnd(sub));
        updatePayload.cancel_at_period_end = sub.cancel_at_period_end;
      } catch (err) {
        console.warn("checkout.session.completed: subscription retrieve failed", err);
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(updatePayload, { onConflict: "id" });

    if (upsertError) {
      return NextResponse.json({ error: "DB Update failed" }, { status: 500 });
    }
  }

  // ==========================================
  // SCÉNÁŘ A2: Vznik/změna předplatného (trial→active, renewal date,
  // naplánované zrušení přes portál, reaktivace) — udržuje
  // subscription_status/trial_end/current_period_end/cancel_at_period_end
  // v syncu nezávisle na checkout.session.completed. Klíčováno přes
  // stripe_customer_id (v tuhle chvíli už vždy nastavený).
  // ==========================================
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    const { error: syncError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        trial_end: toIso(sub.trial_end),
        current_period_end: toIso(getCurrentPeriodEnd(sub)),
        cancel_at_period_end: sub.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId);

    if (syncError) {
      console.warn("customer.subscription sync failed:", syncError);
    }
  }

  // ==========================================
  // SCÉNÁŘ A3: Připomínka konce trialu (Stripe posílá 3 dny předem)
  // ==========================================
  if (event.type === "customer.subscription.trial_will_end") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    try {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile && sub.trial_end) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        const price = sub.items.data[0]?.price;
        const amount = price?.unit_amount ? price.unit_amount / 100 : null;
        const interval = price?.recurring?.interval === "year" ? "rok" : "měsíc";
        const priceLabel = amount !== null ? `${amount.toLocaleString("cs-CZ")} Kč/${interval}` : "další platba";

        if (user?.email) {
          await sendTrialEndingReminder(user.email, new Date(sub.trial_end * 1000), priceLabel);
        }
      }
    } catch (err) {
      console.warn("trial_will_end handling failed:", err);
    }
  }

  // ==========================================
  // SCÉNÁŘ B: Měsíční/roční obnova předplatného
  // ==========================================
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;

    if (invoice.billing_reason === "subscription_cycle" || invoice.billing_reason === "subscription_update") {
      const customerId = invoice.customer as string;

      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, tier")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile && profile.tier === "full") {
        // FULL = neomezene (fair use) — renewal RESETUJE na strop,
        // nepricita (viz FULL_TIER_CREDIT_CEILING docstring).
        const { error: renewError } = await supabaseAdmin
          .from("user_profiles")
          .update({
            credits_remaining: FULL_TIER_CREDIT_CEILING,
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
        stripe_subscription_id: null,
        subscription_status: null,
        trial_end: null,
        current_period_end: null,
        cancel_at_period_end: false,
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
