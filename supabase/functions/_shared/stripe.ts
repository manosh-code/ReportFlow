import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

export type PaidPlan = "agency" | "enterprise";

export function getStripe(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

export function priceIdForPlan(plan: PaidPlan): string {
  switch (plan) {
    case "agency": {
      const id = Deno.env.get("STRIPE_PRICE_AGENCY");
      if (!id) throw new Error("STRIPE_PRICE_AGENCY is not set");
      return id;
    }
    case "enterprise": {
      const id = Deno.env.get("STRIPE_PRICE_ENTERPRISE");
      if (!id) throw new Error("STRIPE_PRICE_ENTERPRISE is not set");
      return id;
    }
    default: {
      const _never: never = plan;
      throw new Error(`Unhandled plan: ${_never}`);
    }
  }
}

export function planFromPriceId(priceId: string | null | undefined): PaidPlan | "free" {
  if (!priceId) return "free";
  if (priceId === Deno.env.get("STRIPE_PRICE_AGENCY")) return "agency";
  if (priceId === Deno.env.get("STRIPE_PRICE_ENTERPRISE")) return "enterprise";
  return "agency";
}

export function isPaidPlan(value: unknown): value is PaidPlan {
  return value === "agency" || value === "enterprise";
}

export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): "active" | "trialing" | "past_due" | "canceled" | "incomplete" {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "incomplete":
      return "incomplete";
    case "paused":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export function periodEndIso(subscription: Stripe.Subscription): string | null {
  if (!subscription.current_period_end) return null;
  return new Date(subscription.current_period_end * 1000).toISOString();
}

export function customerIdFrom(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
