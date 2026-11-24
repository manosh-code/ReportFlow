import type Stripe from "../_shared/stripe.ts";
import type { PaidPlan } from "../_shared/stripe.ts";

export interface Attempt {
  id: string;
  organization_id: string;
  plan: PaidPlan;
  price_id: string;
  origin: string;
  customer_email: string | null;
  customer_name: string;
  initiated_by: string;
  expires_at: string;
  session_id: string | null;
  customer_id: string | null;
  ended_subscription_id: string | null;
}

export class CheckoutConflict extends Error {}

interface AttemptStore {
  reserve(replace?: string): Promise<Attempt>;
  bindCustomer(id: string): Promise<string>;
  saveSession(attempt: string, session: string): Promise<void>;
}

async function findOrCreateSession(stripe: Stripe, attempt: Attempt, customer: string) {
  if (attempt.session_id) return await stripe.checkout.sessions.retrieve(attempt.session_id);
  const expires = Math.floor(Date.parse(attempt.expires_at) / 1000);
  // Stripe requires at least 30 minutes of remaining lifetime. Near or after
  // the deadline, recover a lost create response without issuing another POST.
  if (expires - Date.now() / 1000 < 31 * 60) {
    for await (
      const session of stripe.checkout.sessions.list({
        customer,
        created: { gte: expires - 2 * 3600 - 60 },
        limit: 100,
      })
    ) {
      if (session.metadata?.checkout_attempt === attempt.id) return session;
    }
    if (Date.now() < expires * 1000) throw new CheckoutConflict("Checkout is recovering. Try again later.");
    return null;
  }

  const organization_id = attempt.organization_id;
  const metadata = { organization_id, plan: attempt.plan, checkout_attempt: attempt.id };
  return await stripe.checkout.sessions.create({
    customer,
    mode: "subscription",
    billing_address_collection: "auto",
    allow_promotion_codes: true,
    client_reference_id: organization_id,
    line_items: [{ price: attempt.price_id, quantity: 1 }],
    success_url: attempt.origin + "/dashboard/settings?billing=success",
    cancel_url: attempt.origin + "/dashboard/settings?billing=canceled",
    expires_at: expires,
    metadata,
    subscription_data: { metadata },
  }, { idempotencyKey: "checkout-" + attempt.id });
}

export async function checkoutUrl(stripe: Stripe, store: AttemptStore, plan: PaidPlan) {
  let attempt = await store.reserve();
  for (let pass = 0; pass < 2; pass++) {
    let customer = attempt.customer_id;
    if (!customer) {
      const created = await stripe.customers.create({
        email: attempt.customer_email ?? undefined,
        name: attempt.customer_name,
        metadata: { organization_id: attempt.organization_id, user_id: attempt.initiated_by },
      }, { idempotencyKey: "customer-" + attempt.id });
      customer = await store.bindCustomer(created.id);
    }

    // Avoid creating a session for a different plan on an administrator's retry.
    if (attempt.plan !== plan && !attempt.session_id && Date.parse(attempt.expires_at) > Date.now()) {
      throw new CheckoutConflict("Another plan already has a pending checkout.");
    }
    const session = await findOrCreateSession(stripe, attempt, customer);
    if (session && !attempt.session_id) await store.saveSession(attempt.id, session.id);
    if (session?.status === "open") {
      if (attempt.plan !== plan) throw new CheckoutConflict("Another plan already has a pending checkout.");
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return session.url;
    }
    const ended = session?.status === "complete" && attempt.ended_subscription_id &&
      session.subscription === attempt.ended_subscription_id;
    if (session && session.status !== "expired" && !ended) {
      throw new CheckoutConflict("Checkout completed. Waiting for billing confirmation.");
    }
    if (pass === 0) attempt = await store.reserve(attempt.id);
  }
  throw new CheckoutConflict("Checkout changed. Please try again.");
}
