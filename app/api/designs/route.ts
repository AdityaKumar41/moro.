import { prismaConfigured, withPrismaSession } from "@/lib/prisma";
import { saveDesignForOwner } from "@/lib/design-store";
import { resourcesForOwner } from "@/lib/design-resources";
import { NextResponse } from "next/server";
import { actor, checked, fail, jsonBody, limit, sameOrigin } from "@/lib/http";
import { adminDb } from "@/lib/db";
import { designSchema } from "@/lib/catalog";
export async function GET(req: Request) {
  try {
    const u = await actor();
    const offset = Math.max(
      0,
      Math.min(
        1000000,
        Number(new URL(req.url).searchParams.get("offset")) || 0,
      ),
    );
    const rows = prismaConfigured()
      ? await withPrismaSession(u.id, (db) =>
          db.design.findMany({
            where: { customer_id: u.id },
            orderBy: [{ created_at: "desc" }, { id: "desc" }],
            skip: offset,
            take: 100,
          }),
        )
      : (checked(
          await adminDb()
            .from("designs")
            .select("*")
            .eq("customer_id", u.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(offset, offset + 99),
        ).data ?? []);
    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        artwork: designSchema.parse(row.artwork),
        resources: resourcesForOwner(
          (row.artwork as Record<string, unknown>).resources,
          u.id,
        ),
      })),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor();
    // Debounced cloud autosave and explicit saves share this bounded allowance.
    await limit("design:" + u.id, 60);
    return NextResponse.json(
      await saveDesignForOwner(u.id, await jsonBody(req)),
    );
  } catch (e) {
    return fail(e);
  }
}
