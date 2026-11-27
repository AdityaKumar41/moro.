import { defineConfig } from "prisma/config";

// Generating/validating the client is credential-free. Runtime never uses this
// local placeholder: lib/prisma.ts requires an explicitly configured URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      "postgresql://unused:unused@127.0.0.1:5432/unused",
  },
  experimental: { externalTables: true },
  tables: {
    // Supabase SQL migrations retain ownership of tables and security objects.
    external: [
      "public.profiles",
      "public.designs",
      "public.orders",
      "public.proofs",
      "public.artifacts",
      "public.audit_events",
      "public.jobs",
      "public.notifications",
      "public.payment_events",
      "public.rate_limits",
      "public.products",
      "public.templates",
    ],
  },
});
