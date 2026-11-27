"use client";
import { useEffect, useState, useCallback } from "react";
import { CreditCard, Mail, ArrowUpRight, RefreshCw } from "lucide-react";
import styles from "./integration-status.module.css";
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
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/integrations", { signal });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Connections could not be checked.");
      if (!signal?.aborted) setStatus(data);
    } catch (e) {
      if (!signal?.aborted) setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  if (!status && loading)
    return (
      <section
        className={styles.loading}
        role="status"
        aria-label="Checking service connections"
      >
        <div className="skeleton-block" />
        <div className="skeleton-block" />
      </section>
    );
  if (!status)
    return (
      <section className={styles.error} role="alert">
        <h2>Connections couldn’t be checked.</h2>
        <p>{error}</p>
        <button className="button outline" onClick={() => void load()}>
          Try again
        </button>
      </section>
    );
  return (
    <section className={styles.connections}>
      <div className={styles.heading}>
        <div>
          <h2>Service connections</h2>
          <p>The services behind your orders and customer updates.</p>
        </div>
        <button
          className="button outline"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw size={15} />
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <div className={styles.cards}>
        <article className={styles.card}>
          <div className={styles.icon}>
            <CreditCard size={23} />
          </div>
          <span className="eyebrow">PAYMENTS</span>
          <h3>
            {!status.payments.configured
              ? "Credentials needed"
              : status.payments.mode === "test"
                ? status.payments.testReady
                  ? "Checkout connected"
                  : "Connection needs attention"
                : status.payments.chargesEnabled
                  ? "Ready to accept payments"
                  : "Account action required"}
          </h3>
          <p className="editor-caption">
            {status.payments.mode === "test"
              ? "Stripe · Test mode"
              : "Stripe · Live mode"}
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
            <p className="editor-caption">
              Payments are simulated. No real money is charged.
            </p>
          )}
          <a
            className="button outline small"
            href="https://dashboard.stripe.com/account/status"
            target="_blank"
            rel="noreferrer"
          >
            Open Stripe account <ArrowUpRight size={15} />
          </a>
        </article>
        <article className={styles.card}>
          <div className={styles.icon}>
            <Mail size={23} />
          </div>
          <span className="eyebrow">CUSTOMER EMAIL</span>
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
    </section>
  );
}
