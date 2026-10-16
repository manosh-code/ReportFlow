import { json, optionsResponse } from "../_shared/cors.ts";
import { getStripe, isPaidPlan, priceIdForPlan } from "../_shared/stripe.ts";
import { requireBillingAdmin, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    const body = await req.json();
    const organizationId = body.organizationId ?? body.organization_id;
    const plan = body.plan;

    if (typeof organizationId !== "string" || !organizationId) {
      return json({ error: "organizationId is required" }, 400);
    }
    if (!isPaidPlan(plan)) {
      return json({ error: "plan must be agency or enterprise" }, 400);
    }

    const { admin, subscription, organization } = await requireBillingAdmin(
      organizationId,
      user.id,
    );

    const paidAndCurrent =
      Boolean(subscription.stripe_subscription_id) &&
      (subscription.status === "active" ||
        subscription.status === "trialing" ||
        subscription.status === "past_due");

    if (paidAndCurrent) {
      return json(
        { error: "This organization already has a subscription. Use the billing portal." },
        409,
      );
    }

    const stripe = getStripe();
    let customerId = subscription.stripe_customer_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: organization.name,
        metadata: {
          organization_id: organizationId,
          user_id: user.id,
        },
      });
      customerId = customer.id;
      const { error } = await admin
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("organization_id", organizationId);
      if (error) throw error;
    }

    const origin =
      req.headers.get("origin") ??
      Deno.env.get("SITE_URL") ??
      "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      client_reference_id: organizationId,
      line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
      success_url: `${origin}/dashboard/settings?billing=success`,
      cancel_url: `${origin}/dashboard/settings?billing=canceled`,
      metadata: { organization_id: organizationId, plan },
      subscription_data: {
        metadata: { organization_id: organizationId, plan },
      },
    });

    if (!session.url) return json({ error: "Stripe did not return a checkout URL" }, 500);
    return json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    const status = message === "Not authenticated" ? 401 : 400;
    return json({ error: message }, status);
  }
});
