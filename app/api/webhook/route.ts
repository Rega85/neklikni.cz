import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

// Funkce pro admin přístup (přepisuje RLS)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Musí být SERVICE ROLE KEY
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("❌ Chybí signatura nebo Webhook Secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`❌ Chyba podpisu: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;

    if (!userId) return NextResponse.json({ error: "No user ID" }, { status: 400 });

    // 1. Nejdřív zjistíme, kolik má uživatel aktuálně kreditů
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("credits_remaining")
      .eq("id", userId)
      .single();

    const currentCredits = profile?.credits_remaining || 0;
    const addedCredits = plan === "easy" ? 10 : plan === "basic" ? 50 : 100;

    // 2. Přičteme kredity a uložíme Stripe ID
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
      console.error("❌ Chyba při zápisu kreditů:", updateError);
      return NextResponse.json({ error: "DB Update failed" }, { status: 500 });
    }

    console.log(`✅ Úspěšně připsáno ${addedCredits} kreditů uživateli ${userId}`);
  }

  return NextResponse.json({ received: true });
}