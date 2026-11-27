import { preflightPrintText } from "@/lib/print-preflight";
import { after } from "next/server";
import { drainQueue } from "@/lib/worker";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  actor,
  checked,
  fail,
  HttpError,
  jsonBody,
  limit,
  sameOrigin,
} from "@/lib/http";
import { adminDb } from "@/lib/db";
import { validateArtwork, designSchema } from "@/lib/catalog";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), proofId: z.uuid() }),
  z.object({
    action: z.literal("changes"),
    proofId: z.uuid(),
    comment: z.string().min(5).max(2000),
  }),
  z.object({ action: z.literal("publish_proof"), artwork: designSchema }),
  z.object({ action: z.literal("advance") }),
]);
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const { id } = await params;
    z.uuid().parse(id);
    const b = schema.parse(await jsonBody(req));
    const u = await actor(
      b.action === "publish_proof" || b.action === "advance",
    );
    await limit("action:" + u.id);
    if (b.action === "publish_proof") {
      const { data: o } = checked(
        await adminDb()
          .from("orders")
          .select("configuration,variable_data")
          .eq("id", id)
          .single(),
      );
      if (!o) throw new HttpError(404, "Order not found");
      validateArtwork(b.artwork, o.configuration);
      try {
        preflightPrintText(b.artwork, o.configuration, o.variable_data);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
    }
    const result = checked(
      await adminDb().rpc("order_action", {
        p_order: id,
        p_actor: u.id,
        p_action: b.action,
        p_payload: b,
      }),
    );
    after(() => drainQueue().then(() => {}));
    return NextResponse.json(result.data);
  } catch (e) {
    return fail(e);
  }
}
