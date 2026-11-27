import { X509Certificate } from "node:crypto";
import type { PoolConfig } from "pg";
/** A DSN may not downgrade TLS or override the deployment's trusted CA. */
export function postgresPoolConfig(
  connectionString: string,
  caBase64 = process.env.DATABASE_SSL_CA_BASE64,
): PoolConfig {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw Error("A PostgreSQL connection URL is required");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const tlsRequested =
    !local || !!caBase64 || url.searchParams.get("sslmode") === "verify-full";
  for (const key of [
    "ssl",
    "sslmode",
    "sslrootcert",
    "sslcert",
    "sslkey",
    "uselibpqcompat",
    "sslnegotiation",
  ])
    url.searchParams.delete(key);
  let ca: string | undefined;
  if (caBase64) {
    ca = Buffer.from(caBase64, "base64").toString("utf8");
    if (!new X509Certificate(ca).ca)
      throw Error("The database trust certificate must be a CA");
  }
  return {
    connectionString: url.toString(),
    max: 1,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
    ssl: tlsRequested
      ? {
          rejectUnauthorized: true,
          minVersion: "TLSv1.2",
          ...(ca ? { ca } : {}),
        }
      : false,
  };
}
