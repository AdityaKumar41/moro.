"use client";
import { AuthSkeleton } from "@/components/workspace-loading";
import { Suspense, useActionState, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authDestination } from "@/lib/auth-destination";
import { authenticate, resetPassword } from "./actions";
import { FlowerYellow } from "trazo-stickers";
import { PrintPoster } from "@/components/print-poster";
export default function Auth({ googleEnabled }: { googleEnabled: boolean }) {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
function AuthForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const next = authDestination(params.get("next"));
  const [mode, setMode] = useState("login");
  const [googlePending, setGooglePending] = useState(false);
  useEffect(() => {
    const reset = () => setGooglePending(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  const [state, action, pending] = useActionState(authenticate, {
    message: "",
  });
  const [reset, resetAction, resetting] = useActionState(resetPassword, {
    message: "",
  });
  return (
    <section className="auth-shell moro-auth">
      <div className="auth-story">
        <p className="moro-eyebrow">YOUR CUSTOM PRINT WORKSPACE</p>
        <h1>
          Your next print
          <br />
          <em>starts here.</em>
        </h1>
        <p>
          Save designs, track print orders and approve artwork.
          <br />
          Keep it all in one place.
        </p>
        <div className="auth-print">
          <PrintPoster kind="labels" />
        </div>
        <FlowerYellow className="auth-flower" size={100} color="#f0bd45" />
      </div>
      <div className="auth-form">
        <div className="eyebrow">YOUR SPACE AT MORO</div>
        <h2>
          {mode === "signup" ? "Save your print projects." : "Welcome back."}
        </h2>
        <p>
          {mode === "signup"
            ? "Create an account to save your next great idea."
            : "Sign in to pick up where you left off."}
        </p>
        {next.startsWith("/studio") && (
          <p className="auth-return-note">
            Your design is waiting. After signing in, you’ll return to the
            studio.
          </p>
        )}
        {params.get("error") === "unavailable" && (
          <p className="notice" role="status">
            Sign-in is temporarily unavailable. Your design stays in this tab.
            Please try again later.
          </p>
        )}
        {params.get("error") === "expired" && (
          <p className="notice">
            That link has expired. Sign in or request a new reset link.
          </p>
        )}
        {params.get("error") === "google" && (
          <p className="notice" role="alert">
            Google sign-in could not be completed. Try again or use your email
            below. Your design is still here.
          </p>
        )}
        {params.get("error") === "cancelled" && (
          <p className="notice" role="status">
            Google sign-in was cancelled. You can try again or sign in with
            email.
          </p>
        )}
        {googleEnabled && (
          <>
            <a
              className="google-signin"
              aria-busy={googlePending}
              onClick={(e) => {
                if (googlePending) e.preventDefault();
                else setGooglePending(true);
              }}
              href={`/auth/google?next=${encodeURIComponent(next)}`}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.23c1.89-1.74 2.99-4.3 2.99-7.36Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.23-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.12H3.05v2.59A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.39 13.92a6 6 0 0 1 0-3.84V7.49H3.05a10 10 0 0 0 0 9.02l3.34-2.59Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.95 5.49l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z"
                />
              </svg>
              {googlePending ? "Connecting to Google…" : "Continue with Google"}
            </a>
            <div className="auth-divider">
              <span>or use your email</span>
            </div>
          </>
        )}
        <form action={action}>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="mode" value={mode} />
          {mode === "signup" && (
            <label>
              Your name
              <input required name="name" autoComplete="name" maxLength={100} />
            </label>
          )}
          <label>
            Email address
            <input required type="email" name="email" autoComplete="email" />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              name="password"
              minLength={12}
              maxLength={128}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />
          </label>
          <small>At least 12 characters.</small>
          <button disabled={pending} className="button full">
            {pending
              ? "One moment…"
              : mode === "signup"
                ? "Create your account"
                : "Sign in"}
          </button>
          <p role="status" aria-live="polite" className="form-message">
            {state.message}
          </p>
        </form>
        <button
          className="text-link"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "New around here? Create an account"
            : "Already have an account? Sign in"}
        </button>
        {next.startsWith("/studio") && (
          <Link href={next} className="auth-back-link">
            Back to your design
          </Link>
        )}
        <p className="auth-policy-note">
          By continuing, you agree to our <Link href="/terms">terms</Link>. Read
          our <Link href="/privacy">privacy notice</Link>.
        </p>
        <details>
          <summary>Forgot your password?</summary>
          <form action={resetAction}>
            <label>
              Email address
              <input type="email" name="email" required />
            </label>
            <button className="button outline" disabled={resetting}>
              Send reset link
            </button>
            <p role="status">{reset.message}</p>
          </form>
        </details>
      </div>
    </section>
  );
}
