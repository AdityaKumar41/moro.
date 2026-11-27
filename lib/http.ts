import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminDb, sessionDb } from "./db";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function actor(admin = false) {
  const db = await sessionDb();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new HttpError(401, "Please sign in to continue");
  if (admin) {
    const { data } = await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (data?.role !== "admin")
      throw new HttpError(403, "Administrator access required");
  }
  return user;
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || new URL(req.url).host;
  try {
    if (!origin || new URL(origin).host !== host) throw new Error("mismatch");
    if (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))
      throw new Error("https required");
  } catch {
    throw new HttpError(403, "Invalid request origin");
  }
}
export async function jsonBody(req: Request, max = 2100000) {
  if (Number(req.headers.get("content-length") || 0) > max)
    throw new HttpError(413, "Request is too large");
  const text = await req.text();
  if (Buffer.byteLength(text) > max)
    throw new HttpError(413, "Request is too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
export async function limit(key: string, max = 30) {
  const { data, error } = await adminDb().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: max,
  });
  if (error) throw new HttpError(503, "Please try again shortly");
  if (!data)
    throw new HttpError(
      429,
      "Too many requests. Please try again in a minute.",
    );
}
export function fail(e: unknown) {
  if (e instanceof HttpError)
    return NextResponse.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return NextResponse.json(
      { error: e.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  console.error(
    "Request failed",
    e instanceof Error ? e.message : "Unknown error",
  );
  return NextResponse.json(
    { error: "The request could not be completed. Please try again." },
    { status: 503 },
  );
}
export function checked<T extends { error: unknown }>(result: T): T {
  if (result.error)
    throw new HttpError(
      409,
      "The operation could not be completed. Refresh and check the current order state.",
    );
  return result;
}
