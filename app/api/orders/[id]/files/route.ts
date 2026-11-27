import { NextResponse } from "next/server";
import { actor, checked, fail, HttpError } from "@/lib/http";
import { adminDb } from "@/lib/db";
import { z } from "zod";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await actor();
    const { id } = await params;
    z.uuid().parse(id);
    const db = adminDb();
    const { data: o } = checked(
      await db.from("orders").select("*").eq("id", id).single(),
    );
    const { data: p } = checked(
      await db.from("profiles").select("role").eq("id", u.id).single(),
    );
    if (!p || !o) throw new HttpError(404, "Order not found");
    if (o.customer_id !== u.id && p.role !== "admin")
      throw new HttpError(403, "Access denied");
    const url = new URL(req.url);
    const artifact = url.searchParams.get("artifact");
    let bucket = "proofs",
      path: string;
    if (artifact) {
      if (
        p.role !== "admin" ||
        !o.approved_proof_id ||
        o.payment_status !== "paid"
      )
        throw new HttpError(403, "Production files are locked");
      const { data: a } = checked(
        await db
          .from("artifacts")
          .select("*")
          .eq("id", artifact)
          .eq("order_id", id)
          .eq("proof_id", o.approved_proof_id)
          .single(),
      );
      const { data: job } = checked(
        await db
          .from("jobs")
          .select("state")
          .eq("proof_id", o.approved_proof_id)
          .eq("kind", "production")
          .single(),
      );
      if (!job || job.state !== "done")
        throw new HttpError(409, "Files are still rendering");
      bucket = "production";
      path = a.path;
    } else if (url.searchParams.get("upload") === "1") {
      if (p.role !== "admin" || !o.upload_path)
        throw new HttpError(403, "Access denied");
      bucket = "artwork";
      path = o.upload_path;
    } else {
      const proofId = z.uuid().parse(url.searchParams.get("proof"));
      const { data: proof } = checked(
        await db
          .from("proofs")
          .select("preview_path")
          .eq("id", proofId)
          .eq("order_id", id)
          .single(),
      );
      if (!proof?.preview_path)
        throw new HttpError(409, "Proof is still rendering");
      path = proof.preview_path;
      const row = Number(url.searchParams.get("row") || 1);
      const count = o.variable_data.length || 1;
      if (!Number.isInteger(row) || row < 1 || row > count)
        throw new HttpError(400, "Invalid variable-data row");
      path = path.replace(
        /_0001\.png$/,
        `_${String(row).padStart(4, "0")}.png`,
      );
    }
    const { data, error } = await db.storage
      .from(bucket)
      .createSignedUrl(path, 60, {
        download: !!artifact || bucket === "artwork",
      });
    if (error) throw error;
    return NextResponse.redirect(data.signedUrl, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return fail(e);
  }
}
