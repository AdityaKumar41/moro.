import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Service terms" };
import { SupportContact } from "@/components/support-contact";
export default function Terms() {
  return (
    <article className="moro-policy">
      <p className="moro-eyebrow">THE DETAILS</p>
      <h1>
        Good work starts
        <br />
        <em>with clear expectations.</em>
      </h1>
      <p className="policy-intro">
        Moro is a custom print workspace operated by Digital Heroes. These are
        the conditions for using the current service.
      </p>
      <p className="policy-date">Updated 27 November 2026</p>
      <h2>Your account and artwork</h2>
      <p>
        Use accurate account and delivery information and keep your sign-in
        details private. You must have permission to use the artwork, logos and
        personalisation data you upload. You retain your rights to your artwork
        and allow the service to store and process it to provide your requested
        designs, proofs and order files.
      </p>
      <h2>Proofs and production</h2>
      <p>
        The canvas is a preview. Check the generated proof, dimensions,
        spelling, personalisation, material and quantities before approving it.
        A requested change produces a new proof for review. Only the current
        approved proof is eligible for production files. Colours on a screen may
        differ from printed output.
      </p>
      <h2>Current payment and fulfilment status</h2>
      <p>
        The current platform uses Stripe test payments. Test checkout does not
        collect real money or by itself commission physical production or
        dispatch. Displayed INR prices and GST calculations are preview
        quotations. Real production, delivery commitments, tax details and any
        cancellation or refund arrangement require separate confirmation from
        Digital Heroes before a real order is accepted.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not upload unlawful content, malware, other people’s private
        information without permission, or artwork that infringes another
        person’s rights. Do not attempt to access another customer’s projects or
        bypass payment, approval or staff access controls.
      </p>
      <h2>Help with an order or account</h2>
      <p>
        Contact <SupportContact /> and include your order reference where
        relevant. <Link href="/privacy">Our privacy notice</Link> explains how
        account and order information is handled.
      </p>
    </article>
  );
}
