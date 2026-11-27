# moro.

A custom web-to-print storefront, browser design studio, customer workspace and production console. Built with Next.js, React, Supabase, Prisma and Stripe Checkout for six print divisions: labels, race numbers, MTB boards, stamps, awards and laser-cut work.

[![Platform checks](https://github.com/AdityaKumar41/moro./actions/workflows/ci.yml/badge.svg)](https://github.com/AdityaKumar41/moro./actions/workflows/ci.yml)
[![Security analysis](https://github.com/AdityaKumar41/moro./actions/workflows/security.yml/badge.svg)](https://github.com/AdityaKumar41/moro./actions/workflows/security.yml)

**Status:** functional test-payment application under continuing acceptance. Live payments are disabled. Sample prices/GST rates, generated print files need the merchant's approval before real fulfilment. See [readiness](docs/PRD-READINESS.md) for implemented behavior and open requirements.

Live assessment: [open Moro](https://digital-heroes-umber-kappa.vercel.app). Start with the [reviewer walkthrough](docs/SUBMISSION.md).

## Run locally

Use Node.js 24 LTS (Node 22.12+ is also tested) and npm.

```sh
git clone https://github.com/AdityaKumar41/moro..git
cd moro.
npm ci
cp .env.example .env.local
npm run dev
```

The public storefront, calculator and editor can be explored without credentials. Authentication, cloud saving, checkout, private files and staff actions require your own Supabase project and service configuration. The app never substitutes a fake authenticated session or simulated payment success.

```sh
npm run db:validate
npm run typecheck
npm test
npm run build
npm run check:public
npm run check:release
```

The public smoke check starts the production build on an ephemeral local port. Unit/integration tests include a local PostgreSQL-compatible PGlite database, real font geometry and server PDF/PNG rendering. These checks require no merchant credentials and do not send email or charge cards. See [testing](docs/TESTING.md) and [Prisma with Supabase](docs/PRISMA.md).

## What is implemented

- A licensed real-work inspiration gallery grouped by all six product families.
- Parameter-driven products, instant integer-money pricing, automatic volume discounts and GST totals.
- Focused design studio with templates, text, images, movement/resize/rotation, physical print boundaries, keyboard actions, layer ordering/locking/visibility, undo/redo and cloud autosave.
- Versioned private proofs, customer-only approval, revision requests and production-download gates.
- Server-generated per-row PDF/PNG artwork and CSV personalization, with resumable leased jobs.
- Email/password and Google sign-in, saved designs, order history, reorders and emailed/downloadable PDF payment receipts.
- Staff product/template/user management, order pipeline, reporting and operational tools.
- Signed, reconciled, idempotent Stripe Checkout webhooks. Browser return URLs cannot mark an order paid.

The editor is a print editor, not a full Canva replacement. Grouping, multiselection, rich multiline editing, crop tools and editable conversion of arbitrary vector internals are not currently claimed. Production PDFs contain raster RGB artwork, not certified PDF/X, CMYK separation or machine cutting paths.

## Configure services

1. Create a dedicated Supabase project and apply the migrations in filename order. Follow [setup](docs/SETUP.md) and [database documentation](docs/DATABASE.md).
2. Set your own API URL, public anon key and server-only service-role key. Do not put service credentials in `NEXT_PUBLIC_` variables.
3. Configure Supabase SMTP, exact confirmation/reset callback URLs and optional Google OAuth. The OAuth client secret belongs in Supabase, not the frontend.
4. Use Stripe **test** keys and register the signed webhook endpoint. Set `PAYMENTS_MODE=test`; keep `COMMERCE_ENABLED=false`. See [test payments](docs/SANDBOX-PAYMENTS.md).
5. Configure a verified email sender and SMTP or Resend. Payment receipts are attached by the notification worker.
6. Schedule the authenticated worker or run a dedicated Node worker. See [operations](docs/OPERATIONS.md).

No project keys, accounts, customer records, service tokens or private review credentials are distributed. `.env.example` contains configuration names and safe defaults only. Tests that use real services must target your own isolated project and accounts; see [testing](docs/TESTING.md).

## Deploy

Deploy to your Vercel project, set `APP_URL` to its canonical HTTPS origin and supply the service variables through the host's secret settings. Keep preview and production secrets separate. Use the migration and worker instructions before enabling ordering. The [deployment guide](docs/SETUP.md) explains the auth callback allowlist and production gates.

Link this repository to Vercel through its Git integration for deployments after successful review. Public CI runs without production secrets; it does not apply migrations, send customer email or deploy untrusted pull requests.

## Contribute and report security issues

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [third-party notices](THIRD_PARTY_NOTICES.md) and the [release plan](docs/RELEASE-PLAN.md). Code is MIT licensed. Bundled fonts and third-party artwork retain their own licenses. The original assignment PDF, supplied design-reference media, private acceptance records and exported customer files are excluded from the source release.
