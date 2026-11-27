"use client";
import { useActionState } from "react";
import { updatePassword } from "../actions";
export default function Reset() {
  const [state, action, pending] = useActionState(updatePassword, {
    message: "",
  });
  return (
    <section className="wrap narrow page-section">
      <h1>Choose a new password.</h1>
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
        <button className="button" disabled={pending}>
          Update password
        </button>
        <p role="status">{state.message}</p>
      </form>
    </section>
  );
}
