# Reviewer walkthrough

Live application: https://digital-heroes-umber-kappa.vercel.app

Source: https://github.com/AdityaKumar41/moro.

This is a web-to-print storefront, a focused print design studio, a customer workspace and an internal production console. A customer chooses a product, configures it, creates artwork, pays through Stripe test Checkout and approves a versioned proof. Staff can generate and download production files only after the payment and current customer approval gates pass.

Payments intentionally use Stripe test mode. No real card or fulfilment is required for assessment. Private review-account credentials are shared separately and are never included in this repository. Google sign-in and email/password are also available.

## Suggested walkthrough

1. Browse **What we make**, adjust a product's size/material/quantity and observe the instant price, discounts and GST totals. Browse **Inspiration**, filter the six families and expand a photograph's licence credit.
2. Open the **studio**. Choose a template, double-click text to edit, add an image, drag/resize/rotate it and use layers, lock/hide, Delete, duplicate and undo/redo. The print area and bleed remain visible. Guests can try the editor; sign in to save and order.
3. Sign in as the review customer. Rename a design, wait for saved feedback, visit **Your account → Designs**, and reopen it. Add CSV personalization to a race-number design using a matching `{{column}}` text placeholder. Each row must fit the selected print geometry.
4. Continue to checkout with an India billing address. Use Stripe's India test Visa `4000 0035 6000 0008`, a future expiry and CVC `123`, and complete the simulated 3DS challenge. Never use a real card. A browser return alone cannot mark an order paid: the signed webhook must reconcile the amount, currency and order.
5. Open the paid order, inspect its proof and request a revision or approve it as the customer. Revisions invalidate approval of earlier versions. Check the received payment-receipt email/PDF and the authenticated receipt download. The PDF is a payment receipt, not a statutory invoice with an invented GST identity.
6. In a separate session, sign in as the review administrator and open the production workspace. Filter the order list, inspect artwork/configuration and readiness, advance eligible jobs and download current approved output. Review reports and service health. Customer-only approval and paid/current-proof download checks apply on the server.
7. Return as the customer to view order history, reopen saved work and reorder with the current price. Sign out and confirm private customer/staff routes are inaccessible.

The studio accepts JPEG/PNG/WebP layers and private finished source attachments. Supported server output is per-row PDF/PNG with physical dimensions, selected DPI and bleed. AI/SVG/PDF source artwork follows the staff proof/preflight path; it is not silently converted into an invented editable design.

## Reproducible engineering checks

Use Node 24 or Node 22.12+:

```sh
npm ci
npm run db:validate
npm run typecheck
npm test
npm run build
npm run check:public
npm run check:release
```

CI runs these checks on Linux Node 22 and 24, plus dependency audit, secret scanning and CodeQL. Tests cover all six families, SQL/RLS and Prisma parity, payment/proof gates, editor commands/resources, receipts and a 500-row distinct-output render batch. Connected acceptance scripts are opt-in and require isolated test identities; see [TESTING.md](TESTING.md).

## Scope and launch acceptance

[PRD-ACCEPTANCE.md](PRD-ACCEPTANCE.md) maps requirements to implementation and evidence. [PRISMA.md](PRISMA.md) explains the typed schema, restricted-login reads and Supabase security boundaries. SQL migrations retain schema/RLS/RPC ownership.

The assessment deployment is functional with test payments. A real-money manufacturing launch additionally requires actual business/GST details and rates, approved commercial terms, representative physical print/cut acceptance, operational capacity/recovery tests, sender-domain monitoring and staff-security acceptance. Current RGB PDF/PNG artwork is not certified PDF/X/CMYK or machine cutting paths. Future corporate ordering, a native mobile app and full Xero synchronization remain extensions.
