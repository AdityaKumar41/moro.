import { integrationGuard } from "./integration-guard";
import { strict as assert } from "node:assert";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { adminDb } from "../lib/db";
import { defaultConfig, divisions } from "../lib/catalog";
import { initialArtwork } from "../lib/initial-artwork";
const base = process.env.ACCEPTANCE_URL || "http://localhost:3000";
async function cookie(prefix: string) {
  const jar = new Map<string, string>();
  const db = createServerClient(
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
  const { error } = await db.auth.signInWithPassword({
    email: process.env[prefix + "_EMAIL"]!,
    password: process.env[prefix + "_PASSWORD"]!,
  });
  if (error) throw Error("Review login failed");
  return Array.from(jar, ([name, value]) => name + "=" + value).join("; ");
}
async function main() {
  integrationGuard([
    "CUSTOMER_ID",
    "CUSTOMER_EMAIL",
    "CUSTOMER_PASSWORD",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "SANDBOX_ID",
    "SANDBOX_EMAIL",
    "SANDBOX_PASSWORD",
    "ACCEPTANCE_PAID_ORDER_ID",
    "ACCEPTANCE_UNPAID_ORDER_ID",
  ]);
  const db = adminDb(),
    admin = await cookie("ADMIN"),
    customer = await cookie("CUSTOMER"),
    owner = await cookie("SANDBOX");
  const post = (path: string, body: unknown, c = admin, method = "POST") =>
    fetch(base + path, {
      method,
      headers: { origin: base, cookie: c, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const get = (path: string, c = admin) =>
    fetch(base + path, { headers: { cookie: c } });
  const nonce = crypto.randomUUID();
  const productId = "audit-" + nonce.slice(0, 8),
    templateName = "Acceptance layout " + nonce;
  let userId: string | undefined,
    templateId: string | undefined,
    orderId: string | undefined;
  try {
    const denied = await get("/api/admin", customer);
    assert.equal(denied.status, 403);
    const profile = await get("/api/profile", customer);
    assert.equal(profile.status, 200);
    const p = await profile.json();
    assert.equal(
      (
        await post(
          "/api/profile",
          { name: p.name, company: p.company, gstin: p.gstin },
          customer,
        )
      ).status,
      200,
    );
    const reports = await get("/api/reports");
    assert.equal(reports.status, 200);
    const summary = await reports.json();
    const all = await db
      .from("orders")
      .select("total,payment_status,status,configuration");
    if (all.error) throw all.error;
    assert.equal(summary.orders, all.data.length);
    assert.equal(
      summary.revenue,
      all.data
        .filter((o) => o.payment_status === "paid")
        .reduce((s, o) => s + o.total, 0),
    );
    assert.equal(
      summary.completed,
      all.data.filter((o) => o.status === "completed").length,
    );
    const listed = await get("/api/orders");
    assert.equal(listed.status, 200);
    const accepted = (await listed.json()).find(
      (o: { id: string }) => o.id === process.env.ACCEPTANCE_PAID_ORDER_ID!,
    );
    assert(accepted);
    assert.equal(accepted.production_state, "done");
    assert.equal(accepted.artifacts.length, 2);
    assert(
      accepted.artifacts.every(
        (a: { proof_id: string }) => a.proof_id === accepted.approved_proof_id,
      ),
    );
    for (const a of accepted.artifacts) {
      const file = await get(
        "/api/orders/" + accepted.id + "/files?artifact=" + a.id,
      );
      assert.equal(file.status, 200);
      await file.body?.cancel();
    }
    const receipt = await get(
      `/api/orders/${process.env.ACCEPTANCE_PAID_ORDER_ID}/invoice`,
      owner,
    );
    assert.equal(receipt.status, 200);
    assert.equal(
      (await PDFDocument.load(await receipt.arrayBuffer())).getPageCount(),
      1,
    );
    assert(
      (
        await get(
          `/api/orders/${process.env.ACCEPTANCE_PAID_ORDER_ID}/invoice`,
          customer,
        )
      ).status >= 400,
    );
    const receiptPath = `/api/orders/${process.env.ACCEPTANCE_PAID_ORDER_ID}/invoice`;
    const receiptRequestId = crypto.randomUUID();
    try {
      const receiptBody = { requestId: receiptRequestId };
      assert.equal((await post(receiptPath, receiptBody, "")).status, 401);
      assert((await post(receiptPath, receiptBody, customer)).status >= 400);
      assert.equal(
        (
          await post(
            `/api/orders/${process.env.ACCEPTANCE_UNPAID_ORDER_ID}/invoice`,
            receiptBody,
            owner,
          )
        ).status,
        409,
      );
      // A previously sent request is returned without dispatching another email.
      const fixture = await db.from("notifications").insert({
        id: receiptRequestId,
        customer_id: process.env.SANDBOX_ID,
        order_id: process.env.ACCEPTANCE_PAID_ORDER_ID!,
        kind: "receipt_requested",
        state: "sent",
      });
      assert.ifError(fixture.error);
      for (let attempt = 0; attempt < 2; attempt++) {
        const resend = await post(receiptPath, receiptBody, owner);
        assert.equal(resend.status, 202);
        assert.equal((await resend.json()).state, "sent");
      }
      const { data: notifications, error } = await db
        .from("notifications")
        .select("id")
        .eq("id", receiptRequestId);
      assert.ifError(error);
      assert.equal(notifications.length, 1);
    } finally {
      const removed = await db
        .from("notifications")
        .delete()
        .eq("id", receiptRequestId);
      assert.ifError(removed.error);
    }
    const definition = {
      ...divisions[0],
      id: productId,
      name: "Hidden acceptance product",
      approved: false,
      printProfile: { dpi: 150, bleedMm: 2 },
    };
    const inserted = await db
      .from("products")
      .insert({ id: productId, definition, active: false });
    if (inserted.error) throw inserted.error;
    assert.equal((await post("/api/catalog", definition)).status, 200);
    const hidden = await db
      .from("products")
      .select("active,definition")
      .eq("id", productId)
      .single();
    assert.equal(hidden.data?.active, false);
    assert.equal(hidden.data?.definition.printProfile.bleedMm, 2);
    const template = await post("/api/templates", {
      productId: "labels",
      name: templateName,
      artwork: initialArtwork(),
    });
    assert.equal(template.status, 200);
    const tr = await db
      .from("templates")
      .select("id")
      .eq("name", templateName)
      .single();
    if (tr.error) throw tr.error;
    templateId = tr.data.id;
    const library = await get("/api/templates", customer);
    assert.equal(library.status, 200);
    const loaded = await library.json();
    assert(
      loaded.some((t: { id: string }) => t.id === templateId),
      "Signed-in template library must include managed layouts",
    );
    const anonymous = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const anon = await anonymous
      .from("templates")
      .select("id")
      .eq("id", templateId);
    assert.equal(
      anon.data?.length,
      1,
      "Shared layouts are public, while customer designs stay private",
    );
    assert.equal(
      (await post("/api/templates", { id: templateId }, admin, "DELETE"))
        .status,
      200,
    );
    templateId = undefined;
    const newUser = await db.auth.admin.createUser({
      email: "acceptance-" + nonce + "@digitalheroes.test",
      email_confirm: true,
      user_metadata: { name: "Acceptance role fixture" },
    });
    if (newUser.error) throw newUser.error;
    userId = newUser.data.user.id;
    for (const role of ["admin", "customer"]) {
      assert.equal(
        (await post("/api/admin", { action: "role", id: userId, role })).status,
        200,
      );
      const row: { data: { role: string } | null; error: unknown } = await db
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      assert.equal(row.data?.role, role);
    }
    const config = { ...defaultConfig(), quantity: 2 },
      art = initialArtwork();
    art.layers[0].text = "{{name}}";
    const rows = [{ name: "Ada" }, { name: "Sam" }];
    const order = await db
      .from("orders")
      .insert({
        customer_id: process.env.CUSTOMER_ID,
        request_key: crypto.randomUUID(),
        configuration: config,
        artwork: art,
        variable_data: rows,
        pricing: { sandbox: true },
        total: 100,
        currency: "INR",
        shipping: {
          name: "Acceptance fixture",
          email: process.env.CUSTOMER_EMAIL,
        },
        payment_status: "paid",
        status: "completed",
      })
      .select("id")
      .single();
    if (order.error) throw order.error;
    orderId = order.data.id;
    const proof = await db
      .from("proofs")
      .insert({
        order_id: orderId,
        version: 1,
        artwork: art,
        state: "approved",
        approved_by: process.env.CUSTOMER_ID,
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (proof.error) throw proof.error;
    const approved = await db
      .from("orders")
      .update({ approved_proof_id: proof.data.id })
      .eq("id", orderId);
    if (approved.error) throw approved.error;
    const reorder = await post(
      "/api/orders/" + orderId + "/reorder",
      {},
      customer,
    );
    assert.equal(reorder.status, 200);
    const copied = await reorder.json();
    assert.deepEqual(copied.resources.variableData, rows);
    assert.deepEqual(copied.configuration, config);
    assert.equal(copied.artwork.layers[0].text, "{{name}}");
    assert(
      (await post("/api/orders/" + orderId + "/reorder", {}, owner)).status >=
        400,
    );
    console.log(
      JSON.stringify({
        profileUpdate: true,
        adminRoleGate: true,
        reportReconciliation: true,
        privateReceipt: true,
        receiptResendOwnershipAndIdempotency: true,
        approvedProductionDownloads: true,
        hiddenProductPrintProfile: true,
        managedTemplateLibrary: true,
        templateDelete: true,
        userRoleManagement: true,
        bulkReorderPreservesRows: true,
      }),
    );
  } finally {
    if (templateId) await db.from("templates").delete().eq("id", templateId);
    await db.from("products").delete().eq("id", productId);
    if (userId) await db.auth.admin.deleteUser(userId);
    if (orderId) {
      await db
        .from("orders")
        .update({ approved_proof_id: null })
        .eq("id", orderId);
      await db.from("proofs").delete().eq("order_id", orderId);
      await db.from("orders").delete().eq("id", orderId);
    }
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
