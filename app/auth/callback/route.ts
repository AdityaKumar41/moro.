import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authDestination } from "@/lib/auth-destination";
import { sessionDb } from "@/lib/db";
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Runtime/proxy request URLs may expose an internal host. Match the origin
  // used to start OAuth/recovery so the browser retains its session cookies.
  const origin = new URL(process.env.APP_URL || url.origin).origin;
  const code = url.searchParams.get("code");
  const jar = await cookies();
  const destination = authDestination(jar.get("moro-auth-return")?.value);
  if (url.searchParams.has("error")) {
    jar.set("moro-auth-return", "", { path: "/auth", maxAge: 0 });
    const reason =
      url.searchParams.get("error") === "access_denied"
        ? "cancelled"
        : "google";
    return NextResponse.redirect(
      new URL(
        `/auth?error=${reason}&next=${encodeURIComponent(destination)}`,
        origin,
      ),
    );
  }
  try {
    // The provider exchange is mandatory even for a missing/empty code. A
    // user-controlled query parameter never authorizes a session by itself.
    const db = await sessionDb();
    const { error } = await db.auth.exchangeCodeForSession(code || "");
    if (!error) {
      const next =
        url.searchParams.get("next") === "/auth/reset"
          ? "/auth/reset"
          : jar.get("moro-auth-return")?.value;
      jar.set("moro-auth-return", "", { path: "/auth", maxAge: 0 });
      return NextResponse.redirect(new URL(authDestination(next), origin));
    }
  } catch {
    /* Network and provider failures return to a recoverable sign-in screen. */
  }
  jar.set("moro-auth-return", "", { path: "/auth", maxAge: 0 });
  return NextResponse.redirect(
    new URL(
      `/auth?error=expired&next=${encodeURIComponent(destination)}`,
      origin,
    ),
  );
}
