import { NextResponse } from "next/server";
import { z } from "zod";
import { actor, checked, fail, jsonBody, sameOrigin } from "@/lib/http";
import { adminDb } from "@/lib/db";
import { catalogueProduct } from "@/lib/catalog-server";
import { designSchema, validateArtwork, defaultConfig } from "@/lib/catalog";
export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json([]);
    // Staff-created templates are the shared public layout library. Only return
    // the published artwork fields; customer designs never use this endpoint.
    const db = adminDb();
    return NextResponse.json(
      checked(
        await db
          .from("templates")
          .select("id,product_id,name,artwork")
          .order("name")
          .limit(60),
      ).data,
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor(true);
    const body = z
      .object({
        productId: z.string().max(40),
        name: z.string().min(2).max(100),
        artwork: designSchema,
      })
      .parse(await jsonBody(req));
    const product = await catalogueProduct(body.productId);
    validateArtwork(body.artwork, defaultConfig(product.id, [product]));
    checked(
      await adminDb().from("templates").insert({
        product_id: body.productId,
        name: body.name,
        artwork: body.artwork,
      }),
    );
    checked(
      await adminDb()
        .from("audit_events")
        .insert({
          actor_id: u.id,
          event: "template_created",
          detail: { productId: body.productId, name: body.name },
        }),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor(true);
    const { id } = z.object({ id: z.uuid() }).parse(await jsonBody(req, 2000));
    checked(await adminDb().from("templates").delete().eq("id", id));
    checked(
      await adminDb()
        .from("audit_events")
        .insert({
          actor_id: u.id,
          event: "template_deleted",
          detail: { templateId: id },
        }),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
