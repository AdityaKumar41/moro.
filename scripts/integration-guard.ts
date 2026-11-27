/** Real-service acceptance is an explicit opt-in on an isolated test project. */
export function integrationGuard(required: string[]) {
  if (process.env.INTEGRATION_TESTS_ALLOW_MUTATION !== "true")
    throw Error(
      "Real-service checks mutate test records. Use an isolated project and set INTEGRATION_TESTS_ALLOW_MUTATION=true explicitly.",
    );
  const missing = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    ...required,
  ].filter((k) => !process.env[k]);
  if (missing.length)
    throw Error("Missing integration configuration: " + missing.join(", "));
  const app = new URL(process.env.ACCEPTANCE_URL || "http://localhost:3000");
  if (
    app.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(app.hostname)
  )
    throw Error("Remote acceptance targets require HTTPS.");
}
