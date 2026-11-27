import { NextResponse } from "next/server";
import { actor, checked, fail } from "@/lib/http";
import { adminDb } from "@/lib/db";
export async function GET() {
  try {
    const u = await actor(true);
    return NextResponse.json(
      checked(await adminDb().rpc("admin_reports", { p_actor: u.id })).data,
    );
  } catch (e) {
    return fail(e);
  }
}
