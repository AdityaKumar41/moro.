import { beforeAll, afterAll, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222",
  admin = "33333333-3333-4333-8333-333333333333";
let order: string, proof: string;
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202611260001_platform.sql",
      "utf8",
    ).replace("create extension if not exists pgcrypto;", ""),
  );
  await db.exec(
    readFileSync("supabase/migrations/202611260002_catalog_admin.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202611260003_operations.sql", "utf8"),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202611260004_render_progress.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync("supabase/migrations/202611260005_reports.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202611260006_payment_audit.sql", "utf8"),
  );
  await db.query(`insert into auth.users(id) values($1),($2),($3)`, [
    alice,
    bob,
    admin,
  ]);
  await db.query(`update profiles set role='admin' where id=$1`, [admin]);
  const o = await db.query<{ id: string }>(
    `insert into orders(customer_id,request_key,configuration,artwork,pricing,total,currency,shipping,payment_status,status,checkout_id) values($1,gen_random_uuid(),'{}','{}','{}',10000,'INR','{}','paid','proof','plink_test') returning id`,
    [alice],
  );
  order = o.rows[0].id;
  const p = await db.query<{ id: string }>(
    `insert into proofs(order_id,version,artwork,state,preview_path) values($1,1,'{}','ready','private/proof.png') returning id`,
    [order],
  );
  proof = p.rows[0].id;
}, 30000);
afterAll(() => db.close());
async function asCustomer(id: string, fn: () => Promise<void>) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
  try {
    await fn();
  } finally {
    await db.exec("reset role");
  }
}
it("RLS hides another customer’s orders and production artifacts", async () => {
  await asCustomer(bob, async () => {
    expect((await db.query("select * from orders")).rows).toHaveLength(0);
    expect((await db.query("select * from artifacts")).rows).toHaveLength(0);
    expect((await db.query("select * from proofs")).rows).toHaveLength(0);
  });
  await asCustomer(alice, async () => {
    expect((await db.query("select * from orders")).rows).toHaveLength(1);
  });
});
it("customers cannot promote themselves or directly edit orders", async () => {
  await asCustomer(alice, async () => {
    await expect(
      db.query(`update profiles set role='admin' where id=$1`, [alice]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query(`update orders set payment_status='paid'`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query(`select order_action($1,$2,'approve',$3::jsonb)`, [
        order,
        alice,
        JSON.stringify({ proofId: proof }),
      ]),
    ).rejects.toThrow(/permission denied/);
  });
});
it("requires the actual customer and latest ready proof for approval", async () => {
  await expect(
    db.query(`select order_action($1,$2,'approve',$3::jsonb)`, [
      order,
      bob,
      JSON.stringify({ proofId: proof }),
    ]),
  ).rejects.toThrow();
  await expect(
    db.query(`select order_action($1,$2,'approve',$3::jsonb)`, [
      order,
      admin,
      JSON.stringify({ proofId: proof }),
    ]),
  ).rejects.toThrow();
  await db.query(`select order_action($1,$2,'approve',$3::jsonb)`, [
    order,
    alice,
    JSON.stringify({ proofId: proof }),
  ]);
  const approved = await db.query<{ approved_by: string; state: string }>(
    "select approved_by,state from proofs where id=$1",
    [proof],
  );
  expect(approved.rows[0]).toEqual({ approved_by: alice, state: "approved" });
  await expect(
    db.query(`select order_action($1,$2,'approve',$3::jsonb)`, [
      order,
      alice,
      JSON.stringify({ proofId: proof }),
    ]),
  ).rejects.toThrow();
});
it("blocks production before rendering finishes and invalidates approval on revision", async () => {
  await expect(
    db.query(`select order_action($1,$2,'advance','{}')`, [order, admin]),
  ).rejects.toThrow(/Approved production files required/);
  await db.query(
    `select order_action($1,$2,'publish_proof','{"artwork":{}}')`,
    [order, admin],
  );
  const o = await db.query<{ approved_proof_id: string | null }>(
    "select approved_proof_id from orders where id=$1",
    [order],
  );
  expect(o.rows[0].approved_proof_id).toBeNull();
  await expect(
    db.query(`select order_action($1,$2,'approve',$3::jsonb)`, [
      order,
      alice,
      JSON.stringify({ proofId: proof }),
    ]),
  ).rejects.toThrow();
});
it("rejects mismatched payment amounts before recording a provider event", async () => {
  await expect(
    db.query(
      `select apply_payment('fake-event',$1,'pay_test',1,'INR','plink_test','paid')`,
      [order],
    ),
  ).rejects.toThrow(/Payment mismatch/);
  expect(
    (await db.query("select * from payment_events where id='fake-event'")).rows,
  ).toHaveLength(0);
});
it("enforces the server rate window atomically", async () => {
  expect(
    (
      await db.query<{ ok: boolean }>(
        "select consume_rate_limit('test',1) as ok",
      )
    ).rows[0].ok,
  ).toBe(true);
  expect(
    (
      await db.query<{ ok: boolean }>(
        "select consume_rate_limit('test',1) as ok",
      )
    ).rows[0].ok,
  ).toBe(false);
});

it("cannot demote the final administrator", async () => {
  await expect(
    db.query("select set_user_role($1,$1,'customer')", [admin]),
  ).rejects.toThrow(/final administrator/);
});
it("reclaims crashed email leases and increments attempt count", async () => {
  await db.query(
    "insert into notifications(customer_id,order_id,kind,state,locked_until) values($1,$2,'test','sending',now()-interval '1 minute')",
    [alice, order],
  );
  const result = await db.query<{ state: string; attempts: number }>(
    "select * from claim_notifications()",
  );
  expect(
    result.rows.some((r) => r.state === "sending" && r.attempts === 1),
  ).toBe(true);
});

it("applies a captured payment once and attributes automated proof generation to the system", async () => {
  const created = await db.query<{ id: string }>(
    "insert into orders(customer_id,request_key,configuration,artwork,pricing,total,currency,shipping,checkout_id) values($1,gen_random_uuid(),'{}','{}','{}',12500,'INR','{}','plink_capture_test') returning id",
    [alice],
  );
  const id = created.rows[0].id;
  for (let i = 0; i < 2; i++)
    await db.query(
      "select apply_payment('evt_capture',$1,'pay_capture',12500,'INR','plink_capture_test','paid')",
      [id],
    );
  expect(
    (await db.query("select * from proofs where order_id=$1", [id])).rows,
  ).toHaveLength(1);
  expect(
    (await db.query("select * from payment_events where order_id=$1", [id]))
      .rows,
  ).toHaveLength(1);
  const events = await db.query<{ actor_id: string | null }>(
    "select actor_id from audit_events where order_id=$1 and event='automatic_proof_queued'",
    [id],
  );
  expect(events.rows).toEqual([{ actor_id: null }]);
});
