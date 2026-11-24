import { json, optionsResponse } from "../_shared/cors.ts";
import { getStripe, isPaidPlan, priceIdForPlan } from "../_shared/stripe.ts";
import { requireBillingAdmin, requireUser } from "../_shared/supabase.ts";
import { CheckoutConflict, checkoutUrl } from "./session.ts";

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

    const { admin, organization } = await requireBillingAdmin(organizationId, user.id);
    const origin = Deno.env.get("SITE_URL") ?? req.headers.get("origin") ?? "http://localhost:5173";
    const price = priceIdForPlan(plan);
    const url = await checkoutUrl(getStripe(), {
      async reserve(replace) {
        const { data, error } = await admin.rpc("reserve_billing_checkout", {
          p_org: organizationId,
          p_plan: plan,
          p_price: price,
          p_origin: origin,
          p_email: user.email ?? null,
          p_name: organization.name,
          p_user: user.id,
          p_replace: replace ?? null,
        });
        if (error) throw error;
        if (data.blocked) {
          throw new CheckoutConflict(
            "This organization already has a subscription. Use the billing portal.",
          );
        }
        return data;
      },
      async bindCustomer(id) {
        const { error } = await admin.from("subscriptions").update({ stripe_customer_id: id })
          .eq("organization_id", organizationId).is("stripe_customer_id", null);
        if (error) throw error;
        const { data, error: readError } = await admin.from("subscriptions").select("stripe_customer_id")
          .eq("organization_id", organizationId).single();
        if (readError) throw readError;
        if (!data.stripe_customer_id) throw new Error("Stripe customer binding failed");
        return data.stripe_customer_id;
      },
      async saveSession(attempt, session) {
        const { error } = await admin.from("billing_checkout_attempts").update({ session_id: session })
          .eq("id", attempt).eq("organization_id", organizationId).select("id").single();
        if (error) throw error;
      },
    }, plan);
    return json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    const status = err instanceof CheckoutConflict ? 409 : message === "Not authenticated" ? 401 : 400;
    return json({ error: message }, status);
  }
});
