import { json, optionsResponse } from "../_shared/cors.ts";
import { getStripe } from "../_shared/stripe.ts";
import { requireBillingAdmin, requireUser } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const user = await requireUser(req);
    const body = await req.json();
    const organizationId = body.organizationId ?? body.organization_id;

    if (typeof organizationId !== "string" || !organizationId) {
      return json({ error: "organizationId is required" }, 400);
    }

    const { subscription } = await requireBillingAdmin(organizationId, user.id);
    const customerId = subscription.stripe_customer_id as string | null;
    if (!customerId) {
      return json({ error: "No Stripe customer yet. Start a checkout first." }, 400);
    }

    const origin =
      req.headers.get("origin") ??
      Deno.env.get("SITE_URL") ??
      "http://localhost:5173";

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings`,
    });

    return json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portal failed";
    const status = message === "Not authenticated" ? 401 : 400;
    return json({ error: message }, status);
  }
});
