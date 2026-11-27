"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="wrap page-section">
      <h1>Let’s try that again.</h1>
      <p>
        The page could not be loaded. Your saved work is safe in your account.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
