import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authDestination } from "@/lib/auth-destination";
import { googleSignInEnabled } from "@/lib/auth-providers";
import { sessionDb } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = authDestination(url.searchParams.get("next"));
  const origin = new URL(process.env.APP_URL || url.origin).origin;
  const failure = () =>
    NextResponse.redirect(
      new URL(
        `/auth?error=google&next=${encodeURIComponent(destination)}`,
        origin,
      ),
    );
  if (!(await googleSignInEnabled())) return failure();
  try {
    const jar = await cookies();
    jar.set("moro-auth-return", destination, {
      path: "/auth",
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    const db = await sessionDb();
    const { data, error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data.url) return failure();
    return NextResponse.redirect(data.url);
  } catch {
    return failure();
  }
}
