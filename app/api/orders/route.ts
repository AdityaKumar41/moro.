import { saveDesignForOwner } from "@/lib/design-store";
import { readyArtifacts } from "@/lib/production-files";
import { printProfileSchema } from "@/lib/catalog";
import { preflightPrintText } from "@/lib/print-preflight";
import { NextResponse } from "next/server";
import {
  actor,
  checked,
  fail,
  HttpError,
  jsonBody,
  limit,
  sameOrigin,
} from "@/lib/http";
import { adminDb, sessionDb } from "@/lib/db";
import { orderSchema } from "@/lib/orders";
import { price, pricingPolicy } from "@/lib/pricing";
import { catalogueProduct } from "@/lib/catalog-server";
export async function GET(req: Request) {
  try {
    const u = await actor();
    const db = await sessionDb();
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", u.id)
      .single();
    const offset = Math.max(
      0,
      Math.min(
        1000000,
        Number(new URL(req.url).searchParams.get("offset")) || 0,
      ),
    );
    let q = db
      .from("orders")
      .select("*,proofs!proofs_order_id_fkey(*),artifacts(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + 199);
    if (profile?.role !== "admin") q = q.eq("customer_id", u.id);
    const orders = checked(await q).data ?? [];
    if (profile?.role !== "admin") return NextResponse.json(orders);
    const ids = orders.map((o) => o.approved_proof_id).filter(Boolean);
    const chunks = Array.from({ length: Math.ceil(ids.length / 50) }, (_, i) =>
      ids.slice(i * 50, i * 50 + 50),
    );
    const results = await Promise.all(
      chunks.map((ids) =>
        adminDb()
          .from("jobs")
          .select("proof_id,state")
          .eq("kind", "production")
          .in("proof_id", ids),
      ),
    );
    const jobs = results.flatMap((result) => checked(result).data ?? []);
    return NextResponse.json(
      orders.map((o) => {
        const job = jobs.find((j) => j.proof_id === o.approved_proof_id);
        return {
          ...o,
          production_state: job?.state ?? "not_started",
          artifacts: readyArtifacts(
            o.artifacts,
            o.approved_proof_id,
            o.payment_status,
            job?.state,
          ),
        };
      }),
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor();
    await limit("orders:" + u.id, 10);
    const body = orderSchema.parse(await jsonBody(req));
    const policy = pricingPolicy();
    if (!policy.approved)
      throw new HttpError(
        503,
        "Ordering opens once the store rates and tax settings are approved. Your design can still be saved.",
      );
    const db = adminDb();
    if (body.uploadPath) {
      if (
        !body.uploadPath.startsWith(u.id + "/") ||
        body.uploadPath.includes("..")
      )
        throw new HttpError(400, "Invalid artwork upload");
      const { data, error } = await db.storage
        .from("artwork")
        .info(body.uploadPath);
      if (error || !data) throw new HttpError(400, "Artwork upload not found");
    }
    const product = await catalogueProduct(body.configuration.productId);
    const pricing = {
      ...price(body.configuration, policy, product),
      printProfile: printProfileSchema.parse(product.printProfile ?? {}),
    };
    if (!pricing.approved)
      throw new HttpError(
        503,
        "This product’s prices and tax classification are awaiting approval.",
      );
    const existing = checked(
      await db
        .from("orders")
        .select("id")
        .eq("customer_id", u.id)
        .eq("request_key", body.requestKey)
        .maybeSingle(),
    ).data;
    if (existing) return NextResponse.json(existing);
    try {
      preflightPrintText(body.artwork, body.configuration, body.variableData);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    await saveDesignForOwner(u.id, {
      id: body.designId || body.requestKey,
      ownerId: u.id,
      artwork: body.artwork,
      configuration: body.configuration,
      resources: {
        version: 1,
        variableData: body.variableData,
        uploadPath: body.uploadPath,
        uploadName: body.uploadName,
      },
    });
    const row = {
      customer_id: u.id,
      request_key: body.requestKey,
      configuration: body.configuration,
      artwork: body.artwork,
      variable_data: body.variableData,
      upload_path: body.uploadPath,
      shipping: body.shipping,
      pricing,
      total: pricing.total,
      currency: pricing.currency,
    };
    const { data, error } = await db
      .from("orders")
      .upsert(row, {
        onConflict: "customer_id,request_key",
        ignoreDuplicates: true,
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;
    const result =
      data ||
      checked(
        await db
          .from("orders")
          .select("id")
          .eq("customer_id", u.id)
          .eq("request_key", body.requestKey)
          .single(),
      ).data;
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
