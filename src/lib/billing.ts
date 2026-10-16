import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/integrations/supabase/types";

export type PaidPlan = Exclude<Plan, "free">;

export const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "One workspace to try reports, clients, and invites.",
    features: ["1 organization", "Team invites", "Client + report shell"],
  },
  {
    id: "agency" as const,
    name: "Agency",
    price: "$49",
    cadence: "/ month",
    blurb: "For retainers that need a shared reporting cadence.",
    features: ["Unlimited clients", "Shared team seats", "Stripe-managed renewals"],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "$149",
    cadence: "/ month",
    blurb: "For multi-brand agencies that need the higher ceiling.",
    features: ["Everything in Agency", "Priority onboarding", "Custom reporting volume"],
  },
] as const;

async function invokeBilling<T>(
  name: "create-checkout" | "customer-portal",
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>(name, {
    body,
  });
  if (data && typeof data.error === "string" && data.error) {
    throw new Error(data.error);
  }
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as { error?: string };
      throw new Error(payload.error || error.message);
    } catch (parsed) {
      if (parsed instanceof Error && parsed.message !== error.message) throw parsed;
      throw new Error(error.message);
    }
  }
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Empty billing response");
  return data;
}

export async function startCheckout(organizationId: string, plan: PaidPlan) {
  const { url } = await invokeBilling<{ url: string }>("create-checkout", {
    organizationId,
    plan,
  });
  if (!url) throw new Error("No checkout URL returned");
  window.location.assign(url);
}

export async function openBillingPortal(organizationId: string) {
  const { url } = await invokeBilling<{ url: string }>("customer-portal", {
    organizationId,
  });
  if (!url) throw new Error("No portal URL returned");
  window.location.assign(url);
}
