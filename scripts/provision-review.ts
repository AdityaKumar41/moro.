import { integrationGuard } from "./integration-guard";
import { adminDb } from "../lib/db";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
async function main() {
  integrationGuard([]);
  mkdirSync("tmp", { recursive: true });
  const db = adminDb();
  const accounts = [];
  for (const role of ["customer", "admin"]) {
    const email = `review-${role}@digitalheroes.test`;
    const password = randomBytes(24).toString("base64url");
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: role === "admin" ? "Review Operator" : "Review Maker",
      },
    });
    if (error) throw error;
    const { error: e } = await db
      .from("profiles")
      .update({ role })
      .eq("id", data.user.id);
    if (e) throw e;
    accounts.push({ email, password, role, id: data.user.id });
  }
  writeFileSync(
    ".env.review",
    accounts
      .map(
        (a) =>
          `${a.role.toUpperCase()}_EMAIL=${a.email}\n${a.role.toUpperCase()}_PASSWORD=${a.password}\n${a.role.toUpperCase()}_ID=${a.id}`,
      )
      .join("\n") + "\n",
    { mode: 0o600 },
  );
  writeFileSync(
    "tmp/review-access.txt",
    accounts
      .map(
        (a) =>
          `${a.role.toUpperCase()} REVIEW ACCOUNT\nEmail: ${a.email}\nPassword: ${a.password}\n`,
      )
      .join("\n") +
      "\nTest accounts for review only. Remove or rotate them before the store accepts real customers.\n",
    { mode: 0o600 },
  );
  console.log(
    "Created customer and administrator review accounts. Credentials saved privately to tmp/review-access.txt.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
