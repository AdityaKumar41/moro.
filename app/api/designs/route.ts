import { saveDesignForOwner } from "@/lib/design-store";
import { resourcesForOwner } from "@/lib/design-resources";
import { NextResponse } from "next/server";
import { actor, checked, fail, jsonBody, limit, sameOrigin } from "@/lib/http";
import { adminDb } from "@/lib/db";
import { designSchema } from "@/lib/catalog";
export async function GET() {
  try {
    const u = await actor();
    return NextResponse.json(
      (
        checked(
          await adminDb()
            .from("designs")
            .select("*")
            .eq("customer_id", u.id)
            .order("created_at", { ascending: false })
            .limit(100),
        ).data ?? []
      ).map((row) => ({
        ...row,
        artwork: designSchema.parse(row.artwork),
        resources: resourcesForOwner(row.artwork.resources, u.id),
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
