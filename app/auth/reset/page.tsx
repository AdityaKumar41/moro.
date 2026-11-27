"use client";
import Link from "next/link";
import styles from "./reset.module.css";
import { useActionState } from "react";
import { updatePassword } from "../actions";
export default function Reset() {
  const [state, action, pending] = useActionState(updatePassword, {
    message: "",
  });
  return (
    <section className={styles.page}>
      <h1>A fresh start.</h1>
      <p>
        Choose a password with at least 12 characters to secure your print
        workspace.
      </p>
      <form action={action}>
        <label>
          New password
          <input
            type="password"
            name="password"
            minLength={12}
            autoComplete="new-password"
            required
          />
        </label>
        <button disabled={pending} aria-busy={pending}>
          {pending ? "Updating password…" : "Update password"}
        </button>
        <p role="status">{state.message}</p>
      </form>
      <Link href="/auth">Back to sign in</Link>
    </section>
  );
}
