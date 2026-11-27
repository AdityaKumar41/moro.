"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authDestination } from "@/lib/auth-destination";
import { sessionDb } from "@/lib/db";
export async function authenticate(
  _previous: { message: string },
  form: FormData,
) {
  try {
    const db = await sessionDb();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const mode = String(form.get("mode"));
    if (password.length < 12)
      return { message: "Use a password with at least 12 characters." };
    if (mode === "signup") {
      (await cookies()).set(
        "moro-auth-return",
        authDestination(form.get("next")),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/auth",
          maxAge: 86400,
        },
      );
      const { error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { name: String(form.get("name") || "").slice(0, 100) },
          emailRedirectTo: process.env.APP_URL + "/auth/callback",
        },
      });
      if (error)
        return {
          message:
            "Registration could not be completed. Check your details or try signing in.",
        };
      return {
        message: "Check your email to confirm your account, then sign in.",
      };
    }
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error)
      return {
        message:
          "Could not sign in. Check your email, password and email confirmation.",
      };
  } catch {
    return {
      message:
        "Account service is not configured yet. Please try again once the store opens.",
    };
  }
  redirect(authDestination(form.get("next")));
}
export async function signOut() {
  try {
    const db = await sessionDb();
    await db.auth.signOut();
  } catch {}
  redirect("/");
}
export async function resetPassword(_p: { message: string }, form: FormData) {
  try {
    const db = await sessionDb();
    await db.auth.resetPasswordForEmail(String(form.get("email") || ""), {
      redirectTo: process.env.APP_URL + "/auth/callback?next=/auth/reset",
    });
    return {
      message: "If that account exists, a password reset link has been sent.",
    };
  } catch {
    return { message: "Password recovery is temporarily unavailable." };
  }
}
export async function updatePassword(_p: { message: string }, form: FormData) {
  try {
    const password = String(form.get("password") || "");
    if (password.length < 12) return { message: "Use at least 12 characters." };
    const db = await sessionDb();
    const { error } = await db.auth.updateUser({ password });
    return {
      message: error
        ? "Could not update password. Request a new reset link."
        : "Password updated. You can now sign in.",
    };
  } catch {
    return { message: "Password recovery is unavailable." };
  }
}
