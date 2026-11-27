"use client";
import { useEffect, useState } from "react";
type Status = {
  payments: {
    configured: boolean;
    testReady?: boolean;
    mode: string;
    chargesEnabled: boolean | null;
    payoutsEnabled: boolean | null;
    requirements: string[];
    error?: string;
  };
  email: {
    configured: boolean;
    provider: string | null;
    sender: string | null;
  };
  commerceEnabled: boolean;
};
export function IntegrationStatus() {
  const [status, setStatus] = useState<Status>();
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/integrations")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setStatus(d);
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <p className="notice">{error}</p>;
  if (!status)
    return <p className="editor-caption">Checking service connections…</p>;
  return (
    <>
      <h2 className="panel-title">Connected to the real work.</h2>
      <div className="integration-cards">
        <article className="saved-card">
          <span className="eyebrow">STRIPE CHECKOUT</span>
          <h3>
            {!status.payments.configured
              ? "Credentials needed"
              : status.payments.mode === "test"
                ? status.payments.testReady
                  ? "Test API connected"
                  : "Sandbox connection needed"
                : status.payments.chargesEnabled
                  ? "Ready to accept payments"
                  : "Account action required"}
          </h3>
          <p className="editor-caption">
            {status.payments.mode === "test"
              ? "Stripe test environment"
              : "Stripe live environment"}
          </p>
          {status.payments.error && (
            <p className="notice">{status.payments.error}</p>
          )}
          {status.payments.configured &&
            status.payments.mode === "live" &&
            !status.payments.chargesEnabled && (
              <p className="notice">
                Stripe has not enabled charges for this account. Resolve the
                account task in Stripe before collecting live payments.
              </p>
            )}
          {status.payments.mode === "test" && (
            <p className="notice">
              No real money is charged. Use the India-issued test card shown at
              checkout. Test mode can still apply country-specific payment
              restrictions; a successful API connection alone does not verify a
              payment.
            </p>
          )}
          <a
            className="button outline small"
            href="https://dashboard.stripe.com/account/status"
            target="_blank"
            rel="noreferrer"
          >
            Open Stripe account
          </a>
        </article>
        <article className="saved-card">
          <span className="eyebrow">EMAIL DELIVERY</span>
          <h3>
            {status.email.configured
              ? "Sender connected"
              : "Sender connection needed"}
          </h3>
          <p className="editor-caption">
            {status.email.sender || "No sender configured"}
            {status.email.provider && ` · ${status.email.provider}`}
          </p>
          <p className="editor-caption">
            Order confirmations, proof updates and completion notifications use
            the notification outbox. Authentication emails are managed in
            Supabase.
          </p>
        </article>
      </div>
    </>
  );
}
