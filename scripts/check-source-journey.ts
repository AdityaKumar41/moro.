import { strict as assert } from "node:assert";
import { PDFDocument, rgb } from "pdf-lib";
import sharp from "sharp";
import { createServerClient } from "@supabase/ssr";
import { integrationGuard } from "./integration-guard";
import { adminDb } from "../lib/db";
import { defaultConfig } from "../lib/catalog";
import { workOnce } from "../lib/worker";
const base = process.env.ACCEPTANCE_URL || "http://localhost:3200";
async function session(prefix: string) {
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
  const { error } = await c.auth.signInWithPassword({
    email: process.env[prefix + "_EMAIL"]!,
    password: process.env[prefix + "_PASSWORD"]!,
  });
  assert.ifError(error);
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
  const owner = await session("CUSTOMER"),
    other = await session("SANDBOX"),
    db = adminDb();
  const post = (path: string, body: unknown, cookie = owner) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        origin: process.env.ACCEPTANCE_ORIGIN || base,
        "content-type": "application/json",
        cookie,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
  assert.equal((await post("/api/uploads/prepare", {}, "")).status, 401);
  const config = { ...defaultConfig(), width: 80, height: 80, quantity: 1 };
  const doc = await PDFDocument.create();
  doc.addPage([160, 160]).drawRectangle({
    x: 0,
    y: 0,
    width: 160,
    height: 160,
    color: rgb(1, 0, 0),
  });
  const pdf = Buffer.from(await doc.save());
  const png = await sharp({
    create: { width: 400, height: 400, channels: 4, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="red"/></svg>',
  );
  const files = [
    ["pdf", pdf],
    ["ai", pdf],
    ["svg", svg],
    ["png", png],
  ] as const;
  const paths: string[] = [],
    orders: string[] = [],
    designs: string[] = [];
  const stored: { bucket: string; path: string }[] = [];
  try {
    for (const [ext, bytes] of files) {
      console.log("Checking source format: " + ext);
      const grantResponse = await post("/api/uploads", {
        name: "Acceptance source." + ext,
        size: bytes.length,
      });
      assert.equal(grantResponse.status, 200);
      const grant = await grantResponse.json();
      paths.push(grant.path);
      const put = await fetch(grant.signedUrl, {
        method: "PUT",
        headers: { "content-type": grant.contentType },
        body: new Uint8Array(bytes),
      });
      assert.equal(put.ok, true);
      if (ext === "pdf")
        assert.equal(
          (
            await post(
              "/api/uploads/prepare",
              { path: grant.path, name: "Source.pdf", configuration: config },
              other,
            )
          ).status,
          403,
        );
      const prep = await post("/api/uploads/prepare", {
        path: grant.path,
        name: "Source." + ext,
        configuration: config,
      });
      assert.equal(prep.status, 200, await prep.clone().text());
      const prepared = await prep.json();
      assert.equal(prepared.artwork.layers.length, 1);
      assert(prepared.artwork.source.signature);
      const id = crypto.randomUUID();
      designs.push(id);
      const art = { ...prepared.artwork, name: "SOURCE ACCEPTANCE - DELETE" };
      const body = {
        requestKey: crypto.randomUUID(),
        designId: id,
        configuration: config,
        artwork: art,
        uploadPath: grant.path,
        uploadName: "Acceptance." + ext,
        shipping: {
          name: "SOURCE ACCEPTANCE - DELETE",
          email: process.env.CUSTOMER_EMAIL,
          phone: "9999999999",
          line1: "Test building 123",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
          gstin: "",
        },
      };
      if (ext === "pdf") {
        const forged = structuredClone(body);
        forged.artwork.source.signature = "0".repeat(64);
        assert.equal((await post("/api/orders", forged)).status, 400);
      }
      const captured = await post("/api/orders", body);
      assert.equal(captured.status, 201, await captured.clone().text());
      const order = await captured.json();
      orders.push(order.id);
      const data = await db
        .from("orders")
        .select("*")
        .eq("id", order.id)
        .single();
      assert.ifError(data.error);
      assert.equal(data.data.artwork.source.path, grant.path);
      const checkout = "source_fixture_" + order.id;
      await db
        .from("orders")
        .update({ checkout_id: checkout })
        .eq("id", order.id);
      // Synthetic named fixture only: verifies payment-to-proof SQL, not a Stripe charge.
      const paid = await db.rpc("apply_payment", {
        p_event: "source_fixture_" + order.id,
        p_order: order.id,
        p_reference: "synthetic_source_fixture",
        p_amount: data.data.total,
        p_currency: data.data.currency,
        p_checkout: checkout,
        p_state: "paid",
      });
      assert.ifError(paid.error);
      await db.from("notifications").delete().eq("order_id", order.id);
      assert.equal(await workOnce(5, order.id), true);
      const proof = await db
        .from("proofs")
        .select("*")
        .eq("order_id", order.id)
        .single();
      assert.ifError(proof.error);
      assert.equal(proof.data.state, "ready");
      stored.push({ bucket: "proofs", path: proof.data.preview_path });
      const preview = await db.storage
        .from("proofs")
        .download(proof.data.preview_path);
      assert.ifError(preview.error);
      const pixel = await sharp(Buffer.from(await preview.data!.arrayBuffer()))
        .extract({ left: 100, top: 100, width: 1, height: 1 })
        .removeAlpha()
        .raw()
        .toBuffer();
      assert(
        pixel[0] > 245 && pixel[1] < 10,
        "Proof must contain the real uploaded red artwork",
      );
      const approval = await db.rpc("order_action", {
        p_order: order.id,
        p_actor: process.env.CUSTOMER_ID,
        p_action: "approve",
        p_payload: { proofId: proof.data.id },
      });
      assert.ifError(approval.error);
      await db.from("notifications").delete().eq("order_id", order.id);
      assert.equal(await workOnce(5, order.id), true);
      const artifacts = await db
        .from("artifacts")
        .select("*")
        .eq("order_id", order.id);
      assert.ifError(artifacts.error);
      assert.equal(artifacts.data!.length, 2);
      for (const a of artifacts.data!)
        stored.push({ bucket: "production", path: a.path });
      await db.from("notifications").delete().eq("order_id", order.id);
    }
    console.log(
      "PASS PDF, PDF-compatible AI, SVG and PNG: signed private upload -> automatic canvas preparation -> owned order -> automatic proof -> approval -> PDF/PNG production; cross-owner and forged-source denial. Synthetic fixtures only; no Stripe charge or email dispatch.",
    );
  } finally {
    for (const bucket of ["proofs", "production"]) {
      const values = stored
        .filter((s) => s.bucket === bucket)
        .map((s) => s.path);
      if (values.length) await db.storage.from(bucket).remove(values);
    }
    if (paths.length) await db.storage.from("artwork").remove(paths);
    for (const id of orders) {
      for (const table of [
        "notifications",
        "jobs",
        "artifacts",
        "audit_events",
        "payment_events",
      ])
        await db.from(table).delete().eq("order_id", id);
      await db.from("orders").update({ approved_proof_id: null }).eq("id", id);
      await db.from("proofs").delete().eq("order_id", id);
      await db.from("orders").delete().eq("id", id);
    }
    if (designs.length) await db.from("designs").delete().in("id", designs);
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
