import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendNotifications } from "@/lib/worker";
export async function GET(req: Request) {
  const token = process.env.WORKER_TOKEN;
  const got = req.headers.get("authorization");
  const expected = "Bearer " + token;
  if (
    !token ||
    !got ||
    got.length !== expected.length ||
    !timingSafeEqual(Buffer.from(got), Buffer.from(expected))
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ sent: await sendNotifications() });
}
