import { integrationGuard } from "./integration-guard";
import sharp from "sharp";
import { adminDb } from "../lib/db";
import { createClient } from "@supabase/supabase-js";
import { defaultConfig, type Artwork } from "../lib/catalog";
import { price } from "../lib/pricing";
import { workOnce } from "../lib/worker";
import { strict as assert } from "node:assert";
async function main() {
  integrationGuard([
    "CUSTOMER_ID",
    "CUSTOMER_EMAIL",
    "CUSTOMER_PASSWORD",
    "ADMIN_ID",
  ]);
  const db = adminDb();
  const uploadPath =
    process.env.CUSTOMER_ID + "/smoke-" + crypto.randomUUID() + ".png";
  const testPng = await sharp({
    create: { width: 32, height: 32, channels: 4, background: "#244b37" },
  })
    .png()
    .toBuffer();
  const { data: grant, error: grantError } = await db.storage
    .from("artwork")
    .createSignedUploadUrl(uploadPath, { upsert: false });
  if (grantError) throw grantError;
  const put = await fetch(grant.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: testPng,
  });
  assert.equal(
    put.ok,
    true,
    "Signed direct upload must succeed without server credentials in the request",
  );
  await db.storage.from("artwork").remove([uploadPath]);
  const configuration = { ...defaultConfig("race"), quantity: 2 };
  const artwork: Artwork = {
    name: "Automated integration fixture",
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
  const pricing = price(configuration);
  let orderId: string | undefined;
  let paths: { bucket: string; path: string }[] = [];
  try {
    const { data: insert, error } = await db
      .from("orders")
      .insert({
        customer_id: process.env.CUSTOMER_ID,
        request_key: crypto.randomUUID(),
        configuration,
        artwork,
        variable_data: [{ number: "101" }, { number: "102" }],
        pricing,
        total: pricing.total,
        currency: "INR",
        shipping: {
          name: "AUTOMATED TEST - DELETE",
          email: "review-customer@digitalheroes.test",
        },
        payment_status: "paid",
        status: "artwork",
      })
      .select("id")
      .single();
    if (error) throw error;
    orderId = insert.id;
    const { error: proofError } = await db.rpc("order_action", {
      p_order: orderId,
      p_actor: process.env.ADMIN_ID,
      p_action: "publish_proof",
      p_payload: { artwork },
    });
    if (proofError) throw proofError;
    await workOnce(1);
    await workOnce(1);
    const { data: proof, error: pError } = await db
      .from("proofs")
      .select("*")
      .eq("order_id", orderId)
      .single();
    if (pError) throw pError;
    assert.equal(proof.state, "ready", "Worker must publish a viewable proof");
    paths.push(
      { bucket: "proofs", path: proof.preview_path },
      {
        bucket: "proofs",
        path: proof.preview_path.replace("_0001.png", "_0002.png"),
      },
    );
    const customer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
    const { error: login } = await customer.auth.signInWithPassword({
      email: process.env.CUSTOMER_EMAIL!,
      password: process.env.CUSTOMER_PASSWORD!,
    });
    if (login) throw login;
    const { data: visible, error: relation } = await customer
      .from("orders")
      .select("*,proofs!proofs_order_id_fkey(*),artifacts(*)")
      .eq("id", orderId)
      .single();
    if (relation) throw relation;
    assert.equal(
      visible.artifacts.length,
      0,
      "Customer production artifacts must be invisible",
    );
    const { error: change } = await db.rpc("order_action", {
      p_order: orderId,
      p_actor: process.env.CUSTOMER_ID,
      p_action: "changes",
      p_payload: {
        proofId: proof.id,
        comment: "Acceptance check: please revise the proof.",
      },
    });
    if (change) throw change;
    const { error: revision } = await db.rpc("order_action", {
      p_order: orderId,
      p_actor: process.env.ADMIN_ID,
      p_action: "publish_proof",
      p_payload: { artwork },
    });
    if (revision) throw revision;
    await workOnce(1);
    await workOnce(1);
    const { data: revised, error: revisionError } = await db
      .from("proofs")
      .select("*")
      .eq("order_id", orderId)
      .eq("version", 2)
      .single();
    if (revisionError) throw revisionError;
    assert.equal(revised.state, "ready");
    paths.push(
      { bucket: "proofs", path: revised.preview_path },
      {
        bucket: "proofs",
        path: revised.preview_path.replace("_0001.png", "_0002.png"),
      },
    );
    const { error: staleApproval } = await db.rpc("order_action", {
      p_order: orderId,
      p_actor: process.env.CUSTOMER_ID,
      p_action: "approve",
      p_payload: { proofId: proof.id },
    });
    assert(staleApproval, "A superseded proof must not be approved");
    const { error: approval } = await db.rpc("order_action", {
      p_order: orderId,
      p_actor: process.env.CUSTOMER_ID,
      p_action: "approve",
      p_payload: { proofId: revised.id },
    });
    if (approval) throw approval;
    await workOnce(1);
    await workOnce(1);
    const { data: artifacts, error: filesError } = await db
      .from("artifacts")
      .select("*")
      .eq("order_id", orderId);
    if (filesError) throw filesError;
    assert.equal(
      artifacts.length,
      4,
      "Two CSV rows must produce PDF and PNG each",
    );
    paths.push(
      ...artifacts.map((a) => ({ bucket: "production", path: a.path })),
    );
    for (const stage of ["production", "completed"]) {
      const { error } = await db.rpc("order_action", {
        p_order: orderId,
        p_actor: process.env.ADMIN_ID,
        p_action: "advance",
        p_payload: {},
      });
      if (error) throw error;
      const { data } = await db
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();
      assert.equal(data?.status, stage);
    }
    console.log(
      "PASS: live Supabase auth, RLS, proof rendering, revision v1→v2, stale-approval rejection, customer approval, 2-row PDF/PNG merge and gated pipeline completion.",
    );
  } finally {
    if (orderId) {
      for (const bucket of ["proofs", "production"]) {
        const items = paths
          .filter((p) => p.bucket === bucket)
          .map((p) => p.path);
        if (items.length) await db.storage.from(bucket).remove(items);
      }
      await db
        .from("orders")
        .update({ approved_proof_id: null })
        .eq("id", orderId);
      for (const table of [
        "artifacts",
        "jobs",
        "notifications",
        "audit_events",
        "payment_events",
        "proofs",
      ])
        await db.from(table).delete().eq("order_id", orderId);
      await db.from("orders").delete().eq("id", orderId);
      console.log("Integration fixture cleaned up.");
    }
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
