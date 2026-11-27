import { NextResponse } from "next/server";
import { actor, fail, limit, sameOrigin } from "@/lib/http";
import { drainQueue } from "@/lib/worker";
import { timingSafeEqual } from "node:crypto";
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const u = await actor(true);
    await limit("worker:" + u.id, 5);
    return NextResponse.json({ batches: await drainQueue() });
  } catch (e) {
    return fail(e);
  }
}
export async function GET(req: Request) {
  const expected = "Bearer " + process.env.WORKER_TOKEN;
  const actual = req.headers.get("authorization");
  if (
    !process.env.WORKER_TOKEN ||
    !actual ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ batches: await drainQueue() });
  } catch (e) {
    return fail(e);
  }
}
