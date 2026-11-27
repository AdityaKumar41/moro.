import { integrationGuard } from "./integration-guard";
import { strict as assert } from "node:assert";
import { createServerClient } from "@supabase/ssr";
import { adminDb } from "../lib/db";
import { initialArtwork } from "../lib/initial-artwork";
import { defaultConfig } from "../lib/catalog";
const base = process.env.ACCEPTANCE_URL || "http://localhost:3000";
async function session(prefix: string) {
  const jar = new Map<string, string>();
  const client = createServerClient(
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
  const { error } = await client.auth.signInWithPassword({
    email: process.env[prefix + "_EMAIL"]!,
    password: process.env[prefix + "_PASSWORD"]!,
  });
  if (error) throw Error("Review account authentication failed");
  return Array.from(jar, ([name, value]) => name + "=" + value).join("; ");
}
async function main() {
  integrationGuard([
    "CUSTOMER_ID",
    "CUSTOMER_EMAIL",
    "CUSTOMER_PASSWORD",
    "ADMIN_ID",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
  ]);
  const id = crypto.randomUUID(),
    requestKey = crypto.randomUUID();
  const db = adminDb();
  const cookie = await session("CUSTOMER");
  const other = await session("ADMIN");
  const configuration = defaultConfig();
  const artwork = initialArtwork();
  artwork.name = "Studio integration fixture";
  const post = (path: string, body: unknown, sessionCookie = cookie) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        origin: base,
        "Content-Type": "application/json",
        cookie: sessionCookie,
      },
      body: JSON.stringify(body),
    });
  try {
    const guest = await fetch(base + "/api/designs", {
      method: "POST",
      headers: { origin: base, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(guest.status, 401);
    for (const name of [
      "Studio integration fixture",
      "Studio integration fixture updated",
    ]) {
      artwork.name = name;
      const r = await post("/api/designs", {
        id,
        artwork,
        configuration,
        resources: {
          version: 1,
          variableData: [{ number: "101", name: "Project resource check" }],
        },
      });
      assert.equal(r.status, 200);
      assert.equal((await r.json()).id, id);
    }
    const rows = await db
      .from("designs")
      .select("id,name,customer_id")
      .eq("id", id);
    assert.equal(rows.data?.length, 1);
    assert.equal(rows.data?.[0].customer_id, process.env.CUSTOMER_ID);
    assert.equal(rows.data?.[0].name, "Studio integration fixture updated");
    const projects = await fetch(base + "/api/designs", {
      headers: { cookie },
    });
    assert.equal(projects.status, 200);
    const saved = (await projects.json()).find(
      (p: { id: string }) => p.id === id,
    );
    assert.deepEqual(saved.resources.variableData, [
      { number: "101", name: "Project resource check" },
    ]);
    const collision = await post(
      "/api/designs",
      {
        id,
        artwork: { ...artwork, name: "Must never overwrite" },
        configuration,
      },
      other,
    );
    assert(collision.status >= 400);
    const after = await db
      .from("designs")
      .select("name,customer_id")
      .eq("id", id)
      .single();
    assert.equal(after.data?.customer_id, process.env.CUSTOMER_ID);
    assert.equal(after.data?.name, "Studio integration fixture updated");
    const blank = await post("/api/designs", {
      id,
      configuration,
      artwork: { ...artwork, layers: [] },
    });
    assert.equal(blank.status, 200);
    const blankList = await fetch(base + "/api/designs", {
      headers: { cookie },
    });
    assert.deepEqual(
      (await blankList.json()).find((p: { id: string }) => p.id === id).artwork
        .layers,
      [],
    );
    const layerState = {
      ...artwork,
      layers: artwork.layers.map((l, i) => ({
        ...l,
        locked: i === 0,
        hidden: i === 0,
        label: "Layer state fixture",
      })),
    };
    const layerSave = await post("/api/designs", {
      id,
      configuration,
      artwork: layerState,
    });
    assert.equal(layerSave.status, 200);
    const layerList = await fetch(base + "/api/designs", {
      headers: { cookie },
    });
    const layerRecord = (await layerList.json()).find(
      (p: { id: string }) => p.id === id,
    );
    assert.equal(layerRecord.artwork.layers[0].locked, true);
    assert.equal(layerRecord.artwork.layers[0].hidden, true);
    assert.equal(layerRecord.artwork.layers[0].label, "Layer state fixture");
    const bad = await post("/api/orders", {
      requestKey,
      configuration: { ...configuration, quantity: 1 },
      artwork: {
        ...artwork,
        layers: artwork.layers.map((l) => ({ ...l, text: "漢字" })),
      },
      variableData: [],
      shipping: {
        name: "Integration Fixture",
        email: process.env.CUSTOMER_EMAIL,
        phone: "9999999999",
        line1: "Fixture address only",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        gstin: "",
      },
    });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /does not contain/);
    const emptyOrder = await post("/api/orders", {
      requestKey,
      configuration: { ...configuration, quantity: 1 },
      artwork: { ...artwork, layers: [] },
      variableData: [],
      shipping: {
        name: "Integration Fixture",
        email: process.env.CUSTOMER_EMAIL,
        phone: "9999999999",
        line1: "Fixture address only",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        gstin: "",
      },
    });
    assert.equal(emptyOrder.status, 400);
    assert.match((await emptyOrder.json()).error, /visible/);
    // The API must persist a project even when a caller bypasses the studio's
    // explicit Save button. No checkout or email is triggered by this fixture.
    const checkoutDesign = crypto.randomUUID();
    try {
      const body = {
        requestKey,
        designId: checkoutDesign,
        configuration: { ...configuration, quantity: 1 },
        artwork,
        variableData: [{ number: "101", name: "Checkout persistence" }],
        shipping: {
          name: "Integration Fixture",
          email: process.env.CUSTOMER_EMAIL,
          phone: "9999999999",
          line1: "Fixture address only",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
          gstin: "",
        },
      };
      const wrongOwner = await post("/api/designs", {
        ...body,
        id: checkoutDesign,
        ownerId: process.env.ADMIN_ID,
      });
      assert.equal(wrongOwner.status, 409);
      const created = await post("/api/orders", body);
      assert.equal(created.status, 201, await created.clone().text());
      const duplicate = await post("/api/orders", body);
      assert.equal(duplicate.status, 200);
      assert.equal((await duplicate.json()).id, (await created.json()).id);
      const { data: project, error } = await db
        .from("designs")
        .select("artwork,customer_id")
        .eq("id", checkoutDesign)
        .single();
      assert.ifError(error);
      assert.equal(project.customer_id, process.env.CUSTOMER_ID);
      assert.equal(project.artwork.name, artwork.name);
      assert.equal(
        project.artwork.resources.variableData[0].name,
        "Checkout persistence",
      );
    } finally {
      const removed = await db
        .from("orders")
        .delete()
        .eq("request_key", requestKey)
        .eq("customer_id", process.env.CUSTOMER_ID!);
      assert.ifError(removed.error);
      const removedDesign = await db
        .from("designs")
        .delete()
        .eq("id", checkoutDesign)
        .eq("customer_id", process.env.CUSTOMER_ID!);
      assert.ifError(removedDesign.error);
    }
    const orders = await db
      .from("orders")
      .select("id")
      .eq("request_key", requestKey);
    assert.equal(orders.data?.length, 0);
    const account = await fetch(base + "/account", { redirect: "manual" });
    if (account.status === 307) {
      assert.equal(account.headers.get("location"), "/auth?next=/account");
    } else {
      // A route loading boundary may stream a 200 shell before Next redirects.
      assert.equal(account.status, 200);
      const shell = await account.text();
      assert(
        shell.includes("NEXT_REDIRECT") &&
          shell.includes("/auth?next=/account"),
      );
    }
    console.log(
      JSON.stringify({
        checkoutPersistsDesign: true,
        staleAccountSaveDenied: true,
        guestSaveDenied: true,
        repeatedSaveOneProject: true,
        projectResourcesRoundTrip: true,
        crossAccountOverwriteDenied: true,
        unsupportedPrintRejectedBeforeOrder: true,
        guestAccountRedirect: true,
        emptyOrderRejected: true,
        blankDraftRoundTrip: true,
        layerMetadataRoundTrip: true,
      }),
    );
  } finally {
    const { error } = await db
      .from("designs")
      .delete()
      .eq("id", id)
      .eq("customer_id", process.env.CUSTOMER_ID!);
    if (error) throw Error("Fixture cleanup failed");
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
