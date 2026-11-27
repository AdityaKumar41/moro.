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
// Only a small authorization request passes through Vercel. The file goes directly
// to private Storage, avoiding serverless request-size and memory limits.
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor();
    await limit("upload:" + u.id, 10);
    const f = z
      .object({
        name: z.string().min(1).max(200),
        size: z.number().int().min(1).max(20971520),
      })
      .parse(await jsonBody(req, 2000));
    const ext = f.name.split(".").pop()?.toLowerCase();
    const types: Record<string, string> = {
      pdf: "application/pdf",
      ai: "application/postscript",
      svg: "image/svg+xml",
      png: "image/png",
    };
    if (!ext || !types[ext])
      throw new HttpError(400, "Accepted formats: PDF, AI, SVG and PNG");
    const path = `${u.id}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await adminDb()
      .storage.from("artwork")
      .createSignedUploadUrl(path, { upsert: false });
    if (error) throw error;
    return NextResponse.json({
      path,
      signedUrl: data.signedUrl,
      contentType: types[ext],
      preparationRequired: true,
    });
  } catch (e) {
    return fail(e);
  }
}
