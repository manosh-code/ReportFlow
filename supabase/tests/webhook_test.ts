import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { handleWebhook } from "../functions/stripe-webhook/handler.ts";

Deno.test("Edge webhook verifies raw bytes with Web Crypto before processing", async () => {
  const secret = "whsec_fixture";
  Deno.env.set("STRIPE_SECRET_KEY", "sk_test_fixture");
  Deno.env.set("STRIPE_WEBHOOK_SECRET", secret);
  const payload = JSON.stringify({ id: "evt_test", type: "customer.created", data: { object: {} } });
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", secret).update(timestamp + "." + payload).digest("hex");
  const signature = "t=" + timestamp + ",v1=" + digest;
  const deliver = (body: string, header?: string) =>
    handleWebhook(
      new Request("http://localhost", {
        method: "POST",
        body,
        headers: header ? { "stripe-signature": header } : {},
      }),
    );
  assert.equal((await deliver(payload, signature)).status, 200);
  assert.equal((await deliver(payload + " ", signature)).status, 400);
  assert.equal((await deliver(payload)).status, 400);
  Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_other");
  assert.equal((await deliver(payload, signature)).status, 400);
});

Deno.test("a signed subscription update is acknowledged only after the database accepts it", async () => {
  const secret = "whsec_delivery";
  Deno.env.set("STRIPE_SECRET_KEY", "sk_test_fixture");
  Deno.env.set("STRIPE_WEBHOOK_SECRET", secret);
  Deno.env.set("STRIPE_PRICE_AGENCY", "price_fixture");
  Deno.env.set("SUPABASE_URL", "https://database.example");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "fixture");
  const payload = JSON.stringify({
    id: "evt_subscription",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_fixture",
        customer: "cus_fixture",
        status: "active",
        metadata: { organization_id: "org_fixture" },
        items: { data: [{ price: { id: "price_fixture" } }] },
      },
    },
  });
  const t = Math.floor(Date.now() / 1000);
  const mac = createHmac("sha256", secret).update(t + "." + payload).digest("hex");
  const request = () =>
    new Request("http://localhost", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": "t=" + t + ",v1=" + mac },
    });
  const fetch = globalThis.fetch;
  let writes = 0;
  try {
    globalThis.fetch = async (input, init) => {
      const req = new Request(input, init);
      assert.equal(new URL(req.url).pathname, "/rest/v1/rpc/apply_billing_event");
      const rpc = await req.json();
      assert.equal(rpc.p_event, "evt_subscription");
      assert.equal(rpc.p_customer, "cus_fixture");
      assert.equal(rpc.p_org, "org_fixture");
      assert.equal(rpc.p_plan, "agency");
      writes++;
      return writes === 1
        ? Response.json({ message: "fixture database failure" }, { status: 500 })
        : Response.json(true);
    };
    assert.equal((await handleWebhook(request())).status, 500);
    assert.equal((await handleWebhook(request())).status, 200);
    assert.equal(writes, 2);
  } finally {
    globalThis.fetch = fetch;
  }
});
