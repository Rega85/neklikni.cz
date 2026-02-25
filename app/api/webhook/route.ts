import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// ✅ 1. Inicializace MIMO request = bleskový výkon a nutná API verze
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

// ✅ 2. Admin klient držen v paměti
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("❌ Chybí signatura nebo Webhook Secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`❌ Chyba podpisu: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ==========================================
  // 🟢 SCÉNÁŘ A: Zákazník si kupuje tarif poprvé
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

    const currentCredits = profile?.credits_remaining || 0;

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
      console.error("❌ Chyba při zápisu první platby:", updateError);
      return NextResponse.json({ error: "DB Update failed" }, { status: 500 });
    }

    console.log(`✅ První nákup: Připsáno ${addedCredits} kreditů uživateli ${userId}`);
  }

  // ==========================================
  // 🟢 SCÉNÁŘ B: Měsíční obnova předplatného
  // ==========================================
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    
    // Zajímá nás jen měsíční obnova, ne první platba (ta už je zpracovaná nahoře)
    if (invoice.billing_reason === 'subscription_cycle') {
      const customerId = invoice.customer as string;

      // Najdeme uživatele podle Stripe ID, které jsme mu uložili při prvním nákupu
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, credits_remaining, tier")
        .eq("stripe_customer_id", customerId)
        .single();

      if (profile) {
        const addedCredits = profile.tier === "pro" ? 200 : profile.tier === "basic" ? 50 : 10;

        await supabaseAdmin
          .from("user_profiles")
          .update({
            credits_remaining: profile.credits_remaining + addedCredits,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);

        console.log(`✅ Obnova tarifu: Připsáno ${addedCredits} kreditů pro ID ${profile.id}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}