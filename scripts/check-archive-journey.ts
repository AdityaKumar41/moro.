import { strict as assert } from "node:assert";
import { createServerClient } from "@supabase/ssr";
import { adminDb } from "../lib/db";
import { defaultConfig } from "../lib/catalog";
import { initialArtwork } from "../lib/initial-artwork";
import { integrationGuard } from "./integration-guard";
const base = process.env.ACCEPTANCE_URL || "http://localhost:3201";
async function cookie(prefix: string) {
  const jar = new Map<string, string>();
  const c = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => Array.from(jar, ([name, value]) => ({ name, value })),
        setAll: (items) => {
          for (const i of items) jar.set(i.name, i.value);
        },
      },
    },
  );
  const r = await c.auth.signInWithPassword({
    email: process.env[prefix + "_EMAIL"]!,
    password: process.env[prefix + "_PASSWORD"]!,
  });
  assert.ifError(r.error);
  return Array.from(jar, ([name, value]) => name + "=" + value).join("; ");
}
async function main() {
  integrationGuard([
    "CUSTOMER_ID",
    "CUSTOMER_EMAIL",
    "CUSTOMER_PASSWORD",
    "SANDBOX_EMAIL",
    "SANDBOX_PASSWORD",
  ]);
  const db = adminDb(),
    owner = await cookie("CUSTOMER"),
    other = await cookie("SANDBOX"),
    nonce = crypto.randomUUID().replaceAll("-", ""),
    configuration = defaultConfig();
  const orders = Array.from({ length: 201 }, (_, i) => ({
    id: crypto.randomUUID(),
    customer_id: process.env.CUSTOMER_ID!,
    request_key: crypto.randomUUID(),
    configuration,
    artwork: initialArtwork(),
    pricing: { sandbox: true },
    total: 100,
    currency: "INR",
    shipping: {
      name: (i === 0 ? "needle " : "Archive fixture ") + nonce,
      email: "archive@example.test",
    },
    created_at:
      i === 0
        ? "2000-01-01T10:00:00Z"
        : new Date(Date.UTC(2001, 0, 1, 0, 0, i)).toISOString(),
  }));
  const designs = Array.from({ length: 101 }, (_, i) => ({
    id: crypto.randomUUID(),
    customer_id: process.env.CUSTOMER_ID!,
    name: "Archive fixture " + nonce,
    configuration,
    artwork: initialArtwork(),
    created_at: new Date(Date.UTC(2000, 0, 1, 0, 0, i)).toISOString(),
  }));
  const get = async (path: string, c = owner) => {
    const r = await fetch(base + path, {
      headers: { cookie: c },
      signal: AbortSignal.timeout(45000),
    });
    assert.equal(r.status, 200, await r.clone().text());
    return r.json();
  };
  try {
    assert.ifError((await db.from("orders").insert(orders)).error);
    assert.ifError((await db.from("designs").insert(designs)).error);
    const found = await get(
      "/api/orders?" +
        new URLSearchParams({
          search: "needle " + nonce,
          status: "quote",
          family: "labels",
          date: "2000-01-01",
        }),
    );
    assert.equal(
      found.length,
      1,
      "Search must query the complete archive rather than the loaded page",
    );
    assert.equal(found[0].id, orders[0].id);
    assert.equal(
      (
        await get(
          "/api/orders?" + new URLSearchParams({ search: "needle " + nonce }),
          other,
        )
      ).length,
      0,
    );
    const older = await get(
      "/api/orders?" + new URLSearchParams({ search: nonce, offset: "200" }),
    );
    assert.equal(older.length, 1);
    assert.equal(older[0].id, orders[0].id);
    const first = await get("/api/designs"),
      second = await get("/api/designs?offset=100");
    assert.equal(first.length, 100);
    const ids = new Set([...first, ...second].map((d: { id: string }) => d.id));
    for (const d of designs)
      assert(ids.has(d.id), "A saved design disappeared after the first page");
    console.log(
      "PASS: complete-archive order search/status/product/India-day filters, owner isolation, filtered pagination past 200 orders and saved-design retrieval past 100 records. No payment, rendering or emails.",
    );
  } finally {
    for (const [table, rows] of [
      ["orders", orders],
      ["designs", designs],
    ] as const)
      for (let i = 0; i < rows.length; i += 60) {
        const r = await db
          .from(table)
          .delete()
          .in(
            "id",
            rows.slice(i, i + 60).map((v) => v.id),
          );
        assert.ifError(r.error);
      }
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
