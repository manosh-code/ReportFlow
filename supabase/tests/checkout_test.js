import assert from "node:assert/strict";
import { checkoutUrl } from "../functions/create-checkout/session.ts";

function fixture() {
  const attempts = [];
  const customers = new Map();
  const sessions = new Map();
  let customer = null;
  let failSave = false;
  function makeAttempt() {
    const attempt = {
      id: crypto.randomUUID(),
      organization_id: "org",
      plan: "agency",
      price_id: "price_agency",
      customer_name: "Agency",
      initiated_by: "owner",
      origin: "https://example.org",
      expires_at: new Date(Date.now() + 7200000).toISOString(),
    };
    attempts.push(attempt);
    return attempt;
  }
  let current = makeAttempt();
  const store = {
    async reserve(old) {
      if (old === current.id) current = makeAttempt();
      return { ...current, customer_id: customer };
    },
    async bindCustomer(id) {
      return customer ??= id;
    },
    async saveSession(_attempt, session) {
      if (failSave) {
        failSave = false;
        throw Error("connection lost");
      }
      current.session_id = session;
    },
  };
  const stripe = {
    customers: {
      async create(_params, { idempotencyKey: key }) {
        if (!customers.has(key)) customers.set(key, { id: crypto.randomUUID() });
        return customers.get(key);
      },
    },
    checkout: {
      sessions: {
        async create(params, { idempotencyKey: key }) {
          if (!sessions.has(key)) {
            sessions.set(key, {
              id: key,
              status: "open",
              url: "https://checkout/" + key,
              metadata: params.metadata,
            });
          }
          return sessions.get(key);
        },
        async retrieve(id) {
          return sessions.get(id);
        },
        async *list() {
          yield* sessions.values();
        },
      },
    },
  };
  return {
    run: (plan = "agency") => checkoutUrl(stripe, store, plan),
    customers,
    sessions,
    attempts,
    loseResponse() {
      failSave = true;
    },
  };
}

Deno.test("concurrent retries use one customer and one Checkout session", async () => {
  const f = fixture();
  const [a, b] = await Promise.all([f.run(), f.run()]);
  assert.equal(a, b);
  assert.equal(f.customers.size, 1);
  assert.equal(f.sessions.size, 1);
  await assert.rejects(f.run("enterprise"), /Another plan/);
});

Deno.test("lost session write recovers, completed session blocks, expired session rotates", async () => {
  const f = fixture();
  f.loseResponse();
  await assert.rejects(f.run(), /connection lost/);
  const [session] = f.sessions.values();
  assert.equal(await f.run(), session.url);
  session.status = "complete";
  await assert.rejects(f.run(), /Waiting for billing/);
  session.status = "expired";
  assert.notEqual(await f.run(), session.url);
  assert.equal(f.customers.size, 1);
  assert.equal(f.sessions.size, 2);
});

Deno.test("an expired local deadline cannot replace a remotely completed but unrecorded session", async () => {
  const f = fixture();
  f.loseResponse();
  await assert.rejects(f.run(), /connection lost/);
  const [session] = f.sessions.values();
  session.status = "complete";
  f.attempts[0].expires_at = new Date(Date.now() - 1000).toISOString();
  await assert.rejects(f.run(), /Waiting for billing/);
  assert.equal(f.sessions.size, 1);
});
