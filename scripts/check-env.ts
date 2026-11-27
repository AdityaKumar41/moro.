const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "EMAIL_FROM",
  "WORKER_TOKEN",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing configuration: " + missing.join(", "));
  process.exitCode = 1;
} else console.log("All required integration variables are present.");
if (process.env.COMMERCE_ENABLED !== "true")
  console.log(
    "Live ordering is disabled. Approve business settings before enabling it.",
  );
if (
  process.env.NODE_ENV === "production" &&
  !process.env.APP_URL?.startsWith("https://")
) {
  console.error("Production requires an HTTPS APP_URL.");
  process.exitCode = 1;
}

if (
  !process.env.RESEND_API_KEY &&
  !(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
) {
  console.error(
    "Configure SMTP_HOST, SMTP_USER and SMTP_PASSWORD, or RESEND_API_KEY.",
  );
  process.exitCode = 1;
}
