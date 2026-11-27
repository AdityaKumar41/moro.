import { it, expect } from "vitest";
import { postgresPoolConfig } from "../lib/postgres-config";
it("requires validated TLS for remote PostgreSQL even when a DSN requests weaker modes", () => {
  for (const mode of [
    "disable",
    "prefer",
    "require",
    "verify-ca",
    "verify-full",
  ]) {
    const c = postgresPoolConfig(
      `postgresql://fixture:fixture@db.example.com:5432/postgres?sslmode=${mode}&uselibpqcompat=true`,
      "",
    );
    expect(c.ssl).toMatchObject({
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    });
    expect(c.connectionString).not.toContain("sslmode");
    expect(c.connectionString).not.toContain("uselibpqcompat");
    expect(c.max).toBe(1);
  }
});
it("allows local development and rejects malformed trust material or non-PostgreSQL URLs", () => {
  expect(
    postgresPoolConfig(
      "postgresql://fixture:fixture@127.0.0.1:5432/postgres",
      "",
    ).ssl,
  ).toBe(false);
  expect(() => postgresPoolConfig("https://db.example.com", "")).toThrow(
    "PostgreSQL",
  );
  expect(() =>
    postgresPoolConfig("postgresql://db.example.com", "invalid"),
  ).toThrow();
});
