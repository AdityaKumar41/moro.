import { prismaConfigured, withPrismaSession } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { actor, checked, fail, jsonBody, sameOrigin } from "@/lib/http";
import { adminDb } from "@/lib/db";
export async function GET() {
  try {
    const u = await actor();
    const data = prismaConfigured()
      ? await withPrismaSession(u.id, (db) =>
          db.profile.findUniqueOrThrow({ where: { id: u.id } }),
        )
      : checked(
          await adminDb().from("profiles").select("*").eq("id", u.id).single(),
        ).data;
    return NextResponse.json({ ...data, email: u.email });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor();
    const b = z
      .object({
        name: z.string().min(2).max(100),
        company: z.string().max(100),
        gstin: z.string().max(15),
      })
      .parse(await jsonBody(req));
    checked(await adminDb().from("profiles").update(b).eq("id", u.id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
