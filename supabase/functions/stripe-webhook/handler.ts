import Stripe, {
  customerIdFrom,
  getStripe,
  mapStripeStatus,
  periodEndIso,
  planFromPriceId,
} from "../_shared/stripe.ts";
import { serviceClient } from "../_shared/supabase.ts";

async function subscriptionChange(event: Stripe.Event, stripe: Stripe) {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return { subscription: event.data.object, metadata: event.data.object.metadata };
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription") return null;
      if (!session.subscription) throw new Error("Missing Checkout subscription");
      const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      return { subscription: await stripe.subscriptions.retrieve(id), metadata: session.metadata };
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const ref = event.data.object.subscription;
      if (!ref) return null;
      const subscription = await stripe.subscriptions.retrieve(typeof ref === "string" ? ref : ref.id);
      return { subscription, metadata: subscription.metadata };
    }
    default:
      return null;
  }
}

export async function handleWebhook(req: Request) {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook configuration missing", { status: 500 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const change = await subscriptionChange(event, stripe);
    if (change) {
      const { subscription, metadata } = change;
      const status = mapStripeStatus(subscription.status);
      const { error } = await serviceClient().rpc("apply_billing_event", {
        p_event: event.id,
        p_type: event.type,
        p_org: metadata?.organization_id ?? subscription.metadata?.organization_id ?? null,
        p_customer: customerIdFrom(subscription.customer),
        p_subscription: subscription.id,
        p_plan: status === "canceled" ? "free" : planFromPriceId(subscription.items.data[0]?.price.id),
        p_status: status,
        p_period_end: periodEndIso(subscription),
      });
      if (error) throw error;
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Billing event failed", event.id, error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
