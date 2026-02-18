import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;

      if (!userId || !plan) {
        console.error("Missing metadata");
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      if (plan === "easy") {
        // Jednorázový balíček: přidej 10 kreditů
        await supabaseAdmin
          .from("user_profiles")
          .update({
            credits_remaining: supabaseAdmin.rpc ? undefined : 0, // handled below
            stripe_customer_id: session.customer as string,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // Přičti 10 kreditů atomicky
        await supabaseAdmin.rpc("add_credits", {
          p_user_id: userId,
          p_amount: 10,
        });
      }

      if (plan === "basic") {
        await supabaseAdmin
          .from("user_profiles")
          .update({
            tier: "basic",
            credits_remaining: 50,
            credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      if (plan === "pro") {
        await supabaseAdmin
          .from("user_profiles")
          .update({
            tier: "pro",
            credits_remaining: 200,
            credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
    }

    // Když se předplatné zruší
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      
      await supabaseAdmin
        .from("user_profiles")
        .update({
          tier: "free",
          credits_remaining: 0,
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}