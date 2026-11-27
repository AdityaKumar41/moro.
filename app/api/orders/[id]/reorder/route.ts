import { verifyPreparedSource } from "@/lib/source-artwork";
import { designSchema } from "@/lib/catalog";
import { NextResponse } from "next/server";
import { actor, checked, fail, HttpError, sameOrigin } from "@/lib/http";
import { adminDb } from "@/lib/db";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const u = await actor();
    const { id } = await params;
    const { data: o } = checked(
      await adminDb()
        .from("orders")
        .select(
          "configuration,variable_data,upload_path,approved_proof_id,proofs!proofs_order_id_fkey(id,artwork)",
        )
        .eq("id", id)
        .eq("customer_id", u.id)
        .single(),
    );
    if (!o?.approved_proof_id)
      throw new HttpError(409, "Approve the original design before reordering");
    const proof = o.proofs.find(
      (p: { id: string }) => p.id === o.approved_proof_id,
    );
    if (!proof) throw new HttpError(409, "Approved artwork unavailable");
    const artwork = designSchema.parse(proof.artwork);
    let sourcePath: string | undefined;
    if (
      o.upload_path &&
      o.upload_path.startsWith(u.id + "/") &&
      artwork.source &&
      verifyPreparedSource(artwork, o.upload_path)
    ) {
      const original = await adminDb()
        .storage.from("artwork")
        .info(o.upload_path);
      if (!original.error && original.data) sourcePath = o.upload_path;
    }
    // Approved pixels remain reusable even after a staff revision, key rotation
    // or original-file removal. Never re-import an older, different source.
    if (!sourcePath) delete artwork.source;
    return NextResponse.json({
      configuration: o.configuration,
      artwork,
      resources: {
        version: 1,
        variableData: o.variable_data || [],
        uploadPath: sourcePath,
        uploadName: sourcePath ? "Original source artwork" : undefined,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
