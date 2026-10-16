import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import {
  customerIdFrom,
  getStripe,
  mapStripeStatus,
  periodEndIso,
  planFromPriceId,
} from "../_shared/stripe.ts";
import { serviceClient } from "../_shared/supabase.ts";

function priceIdFromSubscription(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price.id ?? null;
}

async function orgIdForCustomer(
  admin: ReturnType<typeof serviceClient>,
  customerId: string | null,
  metadataOrgId?: string | null,
): Promise<string | null> {
  if (metadataOrgId) return metadataOrgId;
  if (!customerId) return null;
  const { data } = await admin
    .from("subscriptions")
    .select("organization_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.organization_id ?? null;
}

async function applySubscription(
  admin: ReturnType<typeof serviceClient>,
  organizationId: string,
  subscription: Stripe.Subscription,
) {
  const priceId = priceIdFromSubscription(subscription);
  const status = mapStripeStatus(subscription.status);
  const plan = status === "canceled" ? "free" : planFromPriceId(priceId);

  const { error } = await admin
    .from("subscriptions")
    .update({
      plan,
      status,
      stripe_customer_id: customerIdFrom(subscription.customer),
      stripe_subscription_id: subscription.id,
      current_period_end: periodEndIso(subscription),
    })
    .eq("organization_id", organizationId);
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !webhookSecret) {
    return new Response("Webhook secret missing", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return new Response(message, { status: 400 });
  }

  const admin = serviceClient();
  const { error: insertError } = await admin.from("stripe_webhook_events").insert({
    id: event.id,
    type: event.type,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(insertError.message, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!subscriptionId) break;
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const organizationId = await orgIdForCustomer(
          admin,
          customerIdFrom(session.customer),
          session.metadata?.organization_id ?? subscription.metadata?.organization_id,
        );
        if (organizationId) await applySubscription(admin, organizationId, subscription);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const organizationId = await orgIdForCustomer(
          admin,
          customerIdFrom(subscription.customer),
          subscription.metadata?.organization_id,
        );
        if (organizationId) await applySubscription(admin, organizationId, subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (!subscriptionId) break;
        const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const organizationId = await orgIdForCustomer(
          admin,
          customerIdFrom(invoice.customer),
          subscription.metadata?.organization_id,
        );
        if (organizationId) await applySubscription(admin, organizationId, subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    await admin.from("stripe_webhook_events").delete().eq("id", event.id);
    return new Response(message, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
