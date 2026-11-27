import { NextResponse } from "next/server";
import { z } from "zod";
import {
  actor,
  fail,
  HttpError,
  jsonBody,
  limit,
  sameOrigin,
} from "@/lib/http";
import { adminDb } from "@/lib/db";
import { catalogueProduct } from "@/lib/catalog-server";
import { configSchema, printProfileSchema } from "@/lib/catalog";
import { prepareSource, sealSource, sourceArtwork } from "@/lib/source-artwork";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await actor();
    await limit("prepare:" + user.id, 10);
    const b = z
      .object({
        path: z.string().max(300),
        name: z.string().min(1).max(200),
        configuration: configSchema,
      })
      .parse(await jsonBody(req, 4000));
    if (
      b.path.includes("..") ||
      !/^[-a-f0-9]{36}\/[a-f0-9-]{36}\.(pdf|ai|svg|png)$/.test(b.path)
    )
      throw new HttpError(400, "Invalid source artwork path");
    if (!b.path.startsWith(user.id + "/")) await actor(true);
    const db = adminDb();
    const info = await db.storage.from("artwork").info(b.path);
    if (info.error || !info.data)
      throw new HttpError(404, "Source artwork not found");
    if (Number(info.data.size) > 20971520)
      throw new HttpError(400, "Choose source artwork up to 20 MB.");
    const file = await db.storage.from("artwork").download(b.path);
    if (file.error || !file.data)
      throw new HttpError(404, "Source artwork not found");
    const product = await catalogueProduct(b.configuration.productId),
      profile = printProfileSchema.parse(product.printProfile ?? {});
    let prepared;
    try {
      prepared = await prepareSource(
        Buffer.from(await file.data.arrayBuffer()),
        b.path,
        b.configuration,
        profile.dpi,
      );
    } catch (e) {
      throw new HttpError(422, (e as Error).message);
    }
    const artwork = sourceArtwork(prepared, b.configuration, b.name);
    artwork.source = sealSource(b.path, prepared.image);
    return NextResponse.json({
      artwork,
      width: prepared.width,
      height: prepared.height,
      dpi: profile.dpi,
      format: prepared.format,
    });
  } catch (e) {
    return fail(e);
  }
}
