import { NextResponse } from "next/server";
import { catalogue } from "@/lib/catalog-server";
import { actor, checked, fail, jsonBody, sameOrigin } from "@/lib/http";
import { productSchema } from "@/lib/catalog";
import { adminDb } from "@/lib/db";
export async function GET() {
  try {
    return NextResponse.json(await catalogue());
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor(true);
    const definition = productSchema.parse(await jsonBody(req, 10000));
    checked(
      await adminDb().from("products").upsert({
        id: definition.id,
        definition,
        updated_at: new Date().toISOString(),
      }),
    );
    checked(
      await adminDb()
        .from("audit_events")
        .insert({
          actor_id: u.id,
          event: "catalogue_updated",
          detail: { productId: definition.id },
        }),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
