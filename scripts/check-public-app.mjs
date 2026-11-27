import { spawn } from "node:child_process";
import { createServer } from "node:net";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
// Next start also loads .env.local. Set explicit empty values to keep this check
// credential-free even in a maintainer's configured checkout.
const env = {
  ...process.env,
  NODE_ENV: "production",
  APP_URL: origin,
  COMMERCE_ENABLED: "false",
  PAYMENTS_MODE: "test",
  NEXT_TELEMETRY_DISABLED: "1",
};
for (const name of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "EMAIL_FROM",
  "RESEND_API_KEY",
  "WORKER_TOKEN",
  "DATABASE_URL",
  "DIRECT_URL",
  "DATABASE_SSL_CA_BASE64",
])
  env[name] = "";
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
child.stdout.on("data", (b) => (logs = (logs + b).slice(-12000)));
child.stderr.on("data", (b) => (logs = (logs + b).slice(-12000)));
let exited = false;
child.on("exit", () => (exited = true));
const get = (path, options = {}) =>
  fetch(origin + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
    ...options,
  });
try {
  const deadline = Date.now() + 30000;
  while (true) {
    try {
      const r = await get("/");
      if (r.status === 200) break;
    } catch {}
    if (exited || Date.now() > deadline)
      throw Error("Built app did not become ready");
    await delay(150);
  }
  for (const path of [
    "/",
    "/products",
    "/work",
    "/studio",
    "/auth",
    "/auth/reset",
    "/privacy",
    "/terms",
  ]) {
    const r = await get(path);
    assert.equal(r.status, 200, path);
    const html = await r.text();
    assert(html.includes("<html"), path);
    assert(html.includes("Skip to content"), path);
    assert(!html.includes("NEXT_REDIRECT"), path);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert(
      r.headers
        .get("content-security-policy")
        ?.includes("frame-ancestors 'none'"),
    );
  }
  // Guest studio hydration depends on this exact status, not just route HTML.
  assert.equal(
    (await get("/api/profile")).status,
    401,
    "Unconfigured identity must resolve as guest",
  );
  const galleryHtml = await (await get("/work")).text();
  assert(galleryHtml.includes("Independent print inspiration"));
  assert(galleryHtml.includes("Photo &amp; licence"));
  for (const family of [
    "labels",
    "race",
    "mtb",
    "stamps",
    "trophies",
    "laser",
  ]) {
    assert(
      galleryHtml.includes(`/images/gallery/${family}.webp`) ||
        galleryHtml.includes(
          encodeURIComponent(`/images/gallery/${family}.webp`),
        ),
      family,
    );
    const photo = await get(`/images/gallery/${family}.webp`);
    assert.equal(photo.status, 200, family);
    assert(photo.headers.get("content-type")?.includes("image/webp"), family);
    assert((await photo.arrayBuffer()).byteLength > 1000, family);
  }
  const catalogue = await get("/api/catalog");
  assert.equal(catalogue.status, 200);
  const products = await catalogue.json();
  assert.equal(products.length, 6);
  const p = products[0];
  const configuration = {
    productId: p.id,
    width: p.width,
    height: p.height,
    quantity: 100,
    material: p.material[0],
  };
  // sameOrigin requires HTTPS on production routes; there is no proxy in this
  // local check, so use the equivalent HTTPS Origin with the same host.
  const originHeader = origin.replace("http:", "https:");
  const quote = await get("/api/quote", {
    method: "POST",
    headers: { origin: originHeader, "content-type": "application/json" },
    body: JSON.stringify(configuration),
  });
  assert.equal(quote.status, 200);
  const price = await quote.json();
  assert.equal(price.total, price.net + price.tax);
  assert.equal(price.approved, false);
  const csrf = await get("/api/quote", {
    method: "POST",
    headers: {
      origin: "https://untrusted.example",
      "content-type": "application/json",
    },
    body: JSON.stringify(configuration),
  });
  assert.equal(csrf.status, 403);
  assert.equal((await get("/api/worker")).status, 401);
  const payment = await get("/api/checkout", {
    method: "POST",
    headers: { origin: originHeader, "content-type": "application/json" },
    body: JSON.stringify({ orderId: "11111111-1111-4111-8111-111111111111" }),
  });
  assert(payment.status >= 400);
  const disabledCheckout = await payment.json();
  assert.equal(typeof disabledCheckout.error, "string");
  assert.equal(disabledCheckout.url, undefined);
  for (const path of ["/account", "/admin"]) {
    const r = await get(path);
    if (r.status === 307)
      assert.equal(
        new URL(r.headers.get("location"), origin).pathname,
        "/auth",
      );
    else {
      const body = await r.text();
      assert(body.includes("NEXT_REDIRECT") && body.includes("/auth"), path);
    }
  }
  console.log(
    "Public production smoke passed: 8 pages, catalogue, quote reconciliation, disabled checkout, CSRF/worker/auth boundaries and security headers.",
  );
} catch (error) {
  console.error(error.message);
  console.error(logs);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((r) => child.once("exit", r)),
    delay(3000).then(() => {
      if (!exited) child.kill("SIGKILL");
    }),
  ]);
}
