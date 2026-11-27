"use client";
import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { INDIA_TEST_CARD } from "../lib/checkout-guidance";
export function TestPaymentGuide({ enabled }: { enabled: boolean }) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  if (!enabled) return null;
  return (
    <aside
      className="checkout-test-guide"
      aria-label="Payment details for this preview"
    >
      <div className="checkout-guide-heading">
        <strong>Payment details for this preview</strong>
        <span>No real charge</span>
      </div>
      <p>
        This checkout uses an India-issued test card. Choose{" "}
        <strong>Card</strong> in Stripe, then enter:
      </p>
      <div className="checkout-guide-card">
        <code>{INDIA_TEST_CARD}</code>
        <button
          type="button"
          aria-label="Copy India test card number"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                INDIA_TEST_CARD.replaceAll(" ", ""),
              );
              setCopied(true);
              setError("");
            } catch {
              setError("Select and copy the number above.");
            }
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <dl>
        <div>
          <dt>Expiry</dt>
          <dd>Any future date</dd>
        </div>
        <div>
          <dt>CVC</dt>
          <dd>Any 3 digits</dd>
        </div>
        <div>
          <dt>Billing country</dt>
          <dd>India</dd>
        </div>
      </dl>
      <p>
        Complete the bank’s <strong>3-D Secure test</strong> prompt to finish.
        The common 4242 test card is US-issued and can fail on this Indian
        account.
      </p>
      <span className="sr-only" role="status">
        {copied ? "Card number copied." : error}
      </span>
      {error && <small>{error}</small>}
    </aside>
  );
}
