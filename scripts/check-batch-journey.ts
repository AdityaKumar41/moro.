import { strict as assert } from "node:assert";
import https from "node:https";
import http from "node:http";
import { writeFile, mkdir } from "node:fs/promises";
import { createServerClient } from "@supabase/ssr";
import sharp, { type Metadata } from "sharp";
import { PDFDocument } from "pdf-lib";
import { integrationGuard } from "./integration-guard";
import { adminDb } from "../lib/db";
import { defaultConfig, type Artwork } from "../lib/catalog";
type Artifact = {
  id: string;
  path: string;
  kind: string;
  row_number: number;
  proof_id: string;
  sha256: string;
};
const base = process.env.ACCEPTANCE_URL!;
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
// The optional edge address is a local diagnostic routing override. Canonical
// Host/SNI and certificate verification remain enabled; system DNS is untouched.
async function call(
  path: string,
  headers: Record<string, string> = {},
  body?: unknown,
) {
  const url = new URL(path, base),
    encoded = body === undefined ? undefined : JSON.stringify(body),
    edge = process.env.ACCEPTANCE_EDGE_IP;
  return new Promise<{
    status: number;
    body: Buffer;
    headers: http.IncomingHttpHeaders;
  }>((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      url,
      {
        method: encoded ? "POST" : "GET",
        ...(edge && url.protocol === "https:"
          ? { hostname: edge, servername: url.hostname }
          : {}),
        headers: {
          host: url.host,
          ...headers,
          ...(encoded
            ? {
                "content-type": "application/json",
                origin: process.env.ACCEPTANCE_ORIGIN || base,
                "content-length": String(Buffer.byteLength(encoded)),
              }
            : {}),
        },
        timeout: 90000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (b) => chunks.push(b));
        res.on("end", () =>
          resolve({
            status: res.statusCode!,
            body: Buffer.concat(chunks),
            headers: res.headers,
          }),
        );
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(Error("Hosted request timed out")));
    if (encoded) req.write(encoded);
    req.end();
  });
}
async function main() {
  integrationGuard([
    "ACCEPTANCE_URL",
    "WORKER_TOKEN",
    "CUSTOMER_ID",
    "CUSTOMER_EMAIL",
    "CUSTOMER_PASSWORD",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
  ]);
  const db = adminDb(),
    customer = await cookie("CUSTOMER"),
    admin = await cookie("ADMIN"),
    designId = crypto.randomUUID();
  let id: string | undefined;
  const capability = await call("/api/admin/integrations", { cookie: admin });
  assert.equal(capability.status, 200);
  assert.equal(
    JSON.parse(capability.body.toString()).capabilities?.targetedWorker,
    true,
    "Deploy the targeted worker before running hosted batch acceptance",
  );
  const c = { ...defaultConfig("race"), width: 60, height: 40, quantity: 500 };
  const artwork: Artwork = {
    name: "BATCH ACCEPTANCE - DELETE",
    background: "#ffffff",
    layers: [
      {
        id: crypto.randomUUID(),
        kind: "text",
        text: "{{number}}",
        x: 500,
        y: 500,
        width: 850,
        height: 400,
        rotation: 0,
        size: 180,
        color: "#244b37",
        font: "sans",
      },
    ],
  };
  const rows = Array.from({ length: 500 }, (_, i) => ({
    number: String(i + 1).padStart(3, "0"),
  }));
  const stored: { bucket: string; path: string }[] = [];
  let completed = false;
  const note = async () => {
    await mkdir("tmp/batch-acceptance", { recursive: true });
    await writeFile(
      "tmp/batch-acceptance/manifest.json",
      JSON.stringify({ orderId: id, designId, stored, completed }),
      { mode: 0o600 },
    );
  };
  try {
    const created = await call(
      "/api/orders",
      { cookie: customer },
      {
        requestKey: crypto.randomUUID(),
        designId,
        artwork,
        configuration: c,
        variableData: rows,
        shipping: {
          name: "BATCH ACCEPTANCE - DELETE",
          email: process.env.CUSTOMER_EMAIL,
          phone: "9999999999",
          line1: "Test building 123",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
          gstin: "",
        },
      },
    );
    assert.equal(created.status, 201, created.body.toString());
    id = JSON.parse(created.body.toString()).id;
    await note();
    const order = await db.from("orders").select("*").eq("id", id).single();
    assert.ifError(order.error);
    const checkout = "batch_fixture_" + id;
    assert.ifError(
      (await db.from("orders").update({ checkout_id: checkout }).eq("id", id))
        .error,
    );
    // Named synthetic fixture, not a Stripe charge. Exercise the real deployed
    // proof/production worker; never claim another order or dispatch the outbox.
    assert.ifError(
      (
        await db.rpc("apply_payment", {
          p_event: "batch_fixture_" + id,
          p_order: id,
          p_reference: "synthetic_batch_fixture",
          p_amount: order.data.total,
          p_currency: order.data.currency,
          p_checkout: checkout,
          p_state: "paid",
        })
      ).error,
    );
    await db.from("notifications").delete().eq("order_id", id);
    async function run(kind: string) {
      for (let attempt = 0; attempt < 25; attempt++) {
        const result = await db
          .from("jobs")
          .select("state,completed_rows,last_error")
          .eq("order_id", id!)
          .eq("kind", kind)
          .single();
        assert.ifError(result.error);
        if (result.data.state === "done") return;
        assert.notEqual(
          result.data.state,
          "failed",
          result.data.last_error || "Batch failed",
        );
        const work = await call("/api/worker?order=" + id, {
          authorization: "Bearer " + process.env.WORKER_TOKEN,
        });
        assert.equal(work.status, 200, work.body.toString());
        assert.equal(
          JSON.parse(work.body.toString()).orderId,
          id,
          "Worker must stay scoped to the fixture",
        );
        const progress = await db
          .from("jobs")
          .select("state,completed_rows,last_error")
          .eq("order_id", id!)
          .eq("kind", kind)
          .single();
        assert.ifError(progress.error);
        console.log(
          kind +
            ": " +
            (progress.data.state === "done"
              ? 500
              : progress.data.completed_rows) +
            "/500 rows, " +
            progress.data.state,
        );
        await db.from("notifications").delete().eq("order_id", id!);
      }
      throw Error("Batch did not finish within the acceptance budget");
    }
    console.log("Running deployed 500-row proof job…");
    await run("proof");
    const proof = await db
      .from("proofs")
      .select("*")
      .eq("order_id", id)
      .single();
    assert.ifError(proof.error);
    assert.equal(proof.data.state, "ready");
    const folder = proof.data.preview_path.slice(
      0,
      proof.data.preview_path.lastIndexOf("/"),
    );
    const files = await db.storage.from("proofs").list(folder, { limit: 1000 });
    assert.ifError(files.error);
    assert.equal(
      files.data!.filter((f) => f.name.endsWith(".png")).length,
      500,
    );
    for (const f of files.data!)
      stored.push({ bucket: "proofs", path: folder + "/" + f.name });
    await note();
    const blocked = await call(
      "/api/orders/" + id + "/files?artifact=" + crypto.randomUUID(),
      {
        cookie: admin,
      },
    );
    assert.equal(
      blocked.status,
      403,
      "Production must remain locked before approval",
    );
    assert.ifError(
      (
        await db.rpc("order_action", {
          p_order: id,
          p_actor: process.env.CUSTOMER_ID,
          p_action: "approve",
          p_payload: { proofId: proof.data.id },
        })
      ).error,
    );
    await db.from("notifications").delete().eq("order_id", id);
    console.log("Running deployed 500-row production job…");
    await run("production");
    const artifacts = await db
      .from("artifacts")
      .select("*", { count: "exact" })
      .eq("order_id", id)
      .order("row_number")
      .returns<
        {
          id: string;
          path: string;
          kind: string;
          row_number: number;
          proof_id: string;
          sha256: string;
        }[]
      >();
    assert.ifError(artifacts.error);
    assert.equal(artifacts.count, 1000);
    assert.equal(artifacts.data!.length, 1000);
    const artifactRows: Artifact[] = artifacts.data || [];
    const unique = new Set<string>();
    for (let row = 1; row <= 500; row++) {
      const pair: Artifact[] = artifactRows.filter((a) => a.row_number === row);
      assert.equal(pair.length, 2);
      assert(
        pair.some((a) => a.kind === "pdf") &&
          pair.some((a) => a.kind === "png"),
      );
      assert(pair.every((a) => a.proof_id === proof.data.id));
      const png = pair.find((a) => a.kind === "png")!;
      unique.add(png.sha256);
    }
    assert.equal(unique.size, 500, "Every personalized PNG must be distinct");
    for (const a of artifactRows)
      stored.push({ bucket: "production", path: a.path });
    await note();
    const dpi = order.data.pricing.printProfile.dpi,
      bleed = order.data.pricing.printProfile.bleedMm;
    for (const row of [1, 250, 500])
      for (const kind of ["png", "pdf"]) {
        const a: Artifact = artifactRows.find(
          (a) => a.row_number === row && a.kind === kind,
        )!;
        const f = await db.storage.from("production").download(a.path);
        assert.ifError(f.error);
        const bytes: Buffer = Buffer.from(await f.data!.arrayBuffer());
        if (kind === "png") {
          const m: Metadata = await sharp(bytes).metadata();
          assert.equal(
            m.width,
            Math.ceil(((c.width + 2 * bleed) / 25.4) * dpi),
          );
          assert.equal(m.density, dpi);
        } else {
          const p = await PDFDocument.load(bytes);
          assert(
            Math.abs(p.getPage(0).getTrimBox().width - (c.width / 25.4) * 72) <
              0.001,
          );
        }
      }
    assert.equal(
      (
        await call(
          "/api/orders/" + id + "/files?artifact=" + artifactRows[0].id,
          { cookie: customer },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call(
          "/api/orders/" + id + "/files?artifact=" + artifactRows[0].id,
          { cookie: admin },
        )
      ).status,
      307,
    );
    completed = true;
    await note();
    console.log(
      "PASS deployed 500-row batch: 500 proof previews, 1000 current PDF/PNG artifacts, 500 unique personalized PNGs, representative DPI/trim/bleed checks, and customer/admin approval/download boundaries.",
    );
  } finally {
    if (id) {
      // Fetch any partial objects too, so an interrupted/failed acceptance is clean.
      for (const bucket of ["proofs", "production"]) {
        const products = await db.storage.from(bucket).list(id);
        for (const product of products.data || []) {
          const dates = await db.storage
            .from(bucket)
            .list(id + "/" + product.name);
          for (const day of dates.data || []) {
            const versions = await db.storage
              .from(bucket)
              .list(id + "/" + product.name + "/" + day.name);
            for (const v of versions.data || []) {
              const prefix =
                id + "/" + product.name + "/" + day.name + "/" + v.name;
              const files = await db.storage
                .from(bucket)
                .list(prefix, { limit: 1000 });
              for (const f of files.data || [])
                stored.push({ bucket, path: prefix + "/" + f.name });
            }
          }
        }
      }
      for (const bucket of ["proofs", "production"]) {
        const paths = [
          ...new Set(
            stored.filter((f) => f.bucket === bucket).map((f) => f.path),
          ),
        ];
        for (let i = 0; i < paths.length; i += 100)
          assert.ifError(
            (await db.storage.from(bucket).remove(paths.slice(i, i + 100)))
              .error,
          );
      }
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
    await db.from("designs").delete().eq("id", designId);
    await note();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
