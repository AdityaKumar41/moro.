import { postgresPoolConfig } from "./postgres-config";
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { z } from "zod";

const globalDb = globalThis as unknown as { moroPrisma?: PrismaClient };
export function prismaConfigured() {
  return !!process.env.DATABASE_URL;
}
function client() {
  if (!process.env.DATABASE_URL)
    throw Error("Database connection is not configured");
  if (!globalDb.moroPrisma) {
    const adapter = new PrismaPg(postgresPoolConfig(process.env.DATABASE_URL));
    globalDb.moroPrisma = new PrismaClient({ adapter, log: [] });
  }
  return globalDb.moroPrisma;
}

/** Actor must come from verified Supabase Auth, never a request body.
 * Transaction-local claims keep RLS scoped to the actor when pool connections
 * are reused. The restricted login has authenticated SELECT privileges only.
 */
export async function withPrismaSession<T>(
  actorId: string,
  read: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const id = z.uuid().parse(actorId);
  return client().$transaction(
    async (tx) => {
      const roles = await tx.$queryRaw<
        { rolsuper: boolean; rolbypassrls: boolean; can_write: boolean }[]
      >`
      select r.rolsuper,r.rolbypassrls,
      has_table_privilege(current_user,'public.orders','UPDATE') as can_write
      from pg_roles r where r.rolname=current_user`;
      if (
        roles.length !== 1 ||
        roles[0].rolsuper ||
        roles[0].rolbypassrls ||
        roles[0].can_write
      )
        throw Error("Prisma requires the restricted application database role");
      await tx.$queryRaw`select set_config('request.jwt.claim.sub',${id},true),
      set_config('request.jwt.claims',${JSON.stringify({ sub: id, role: "authenticated" })},true)`;
      return read(tx);
    },
    { maxWait: 5000, timeout: 10000 },
  );
}
