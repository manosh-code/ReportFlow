// Run against a disposable database with migrations 0001 through 0003 applied.
// BILLING_TEST_DATABASE_URL=... deno test -A supabase/tests/billing_database_test.js
import pg from "npm:pg@8.16.3";
import assert from "node:assert/strict";

Deno.test("checkout reservations serialize and webhook receipts commit with the plan", async () => {
  const connectionString = Deno.env.get("BILLING_TEST_DATABASE_URL");
  assert.ok(connectionString, "Set BILLING_TEST_DATABASE_URL to a disposable migrated database");
  const pool = new pg.Pool({ connectionString });
  const org = crypto.randomUUID();
  const user = crypto.randomUUID();
  const customer = "cus_" + org;
  const event = "evt_" + org;
  const reserve = async (replace = null) =>
    (await pool.query(
      "select reserve_billing_checkout($1,'agency','price','https://example.org',null,'Agency',$2,$3) as attempt",
      [org, user, replace],
    )).rows[0].attempt;
  const apply = async (id, target, status = "active") =>
    (await pool.query(
      "select apply_billing_event($1,'customer.subscription.updated',$2,$3,'sub_' || $3,'agency',$4,null) as applied",
      [id, target, customer, status],
    )).rows[0].applied;
  try {
    await pool.query("insert into organizations(id,name,slug) values ($1::uuid,'Test',$1::uuid::text)", [
      org,
    ]);
    await pool.query("insert into subscriptions(organization_id,stripe_customer_id) values ($1,$2)", [
      org,
      customer,
    ]);
    const [a, b] = await Promise.all([reserve(), reserve()]);
    assert.equal(a.id, b.id);
    const [c, d] = await Promise.all([reserve(a.id), reserve(a.id)]);
    assert.notEqual(c.id, a.id);
    assert.equal(c.id, d.id);

    await assert.rejects(apply(event, crypto.randomUUID()), /No matching billing customer/);
    await assert.rejects(apply(event, org, "invalid"), /check constraint/);
    const receiptCount = async () =>
      (await pool.query(
        "select count(*)::int as n from stripe_webhook_events where id=$1",
        [event],
      )).rows[0].n;
    assert.equal(await receiptCount(), 0);
    const results = await Promise.all([apply(event, org), apply(event, org)]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(await receiptCount(), 1);
    assert.equal((await reserve()).blocked, true);
    assert.equal(
      (await pool.query("select plan from subscriptions where organization_id=$1", [org])).rows[0].plan,
      "agency",
    );
    for (const role of ["anon", "authenticated"]) {
      const result = await pool.query(
        "select has_function_privilege($1,'apply_billing_event(text,text,uuid,text,text,text,text,timestamptz)','EXECUTE') as allowed",
        [role],
      );
      assert.equal(result.rows[0].allowed, false);
    }
  } finally {
    await pool.query("delete from stripe_webhook_events where id=$1", [event]);
    await pool.query("delete from organizations where id=$1", [org]);
    await pool.end();
  }
});
