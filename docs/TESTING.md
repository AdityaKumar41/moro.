# Testing

## Credential-free CI

Node 22 and 24 run `npm ci`, `npm run db:validate`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:public` and `npm run check:release`. The workflow has read-only repository access and no application credentials. Dependency audit and CodeQL run separately. No test charges cards, sends customer email or contacts the deployed service.

Vitest covers pricing/GST/volume thresholds, print geometry/fonts, six product families, a 500-row distinct-output render regression, CSV substitution, PDF/PNG output, payment modes, webhook/approval rules, PGlite migrations/RLS, studio commands/history/resources, request feedback, receipt attachments/transports and auth callback origin/return validation. Database tests use synthetic local identities. The public smoke check starts a built Next server with production secrets removed, checks routes, quotes, security headers, the guest account status required for studio hydration and disabled service boundaries, and shuts it down.

## Isolated real-service acceptance

Use an isolated Supabase project and non-customer accounts. Copy `.env.integration.example` to an ignored `.env.integration`, fill the account IDs/emails/passwords and set `INTEGRATION_TESTS_ALLOW_MUTATION=true` only after reviewing the scripts. Configure `.env.local` for that test project. Never copy production keys into a public CI workflow.

```sh
node --env-file=.env.local --env-file=.env.integration --import tsx scripts/check-studio-journey.ts
node --env-file=.env.local --env-file=.env.integration --import tsx scripts/smoke-production.ts
```

The studio check creates/removes named projects and an unpaid order fixture. The production check creates synthetic paid data, signs uploads, renders two personalized rows, revises/approves proofs and tests the pipeline. These are integration fixtures, not evidence of a Stripe charge. Worker execution may claim other queued work: the project must be isolated. Cleanup applies only to known fixture IDs. Review storage/database after an interrupted run.

`check-prd-services.ts` additionally expects a paid, completed, approved single-row order with two current production artifacts and an unpaid order, both owned by the configured sandbox identity. Set their IDs in the example environment; do not use IDs from another deployment. It checks role boundaries, receipts/resend replay, reports, product/template management and reorder resources. It temporarily creates roles/products/templates and removes its own fixtures.

`provision-review.ts` is opt-in and creates dedicated synthetic customer/admin users, writing random credentials only to ignored local files. It is not a production staff-provisioning tool. `render-sample.ts` generates local artwork under tmp; no sample output belongs in the repository.

## Acceptance beyond CI

Before launch, perform real test-mode hosted payment and signed webhook checks, confirmation/recovery/Google sessions, maximum-size documents and hosted 500-row job-capacity cases, touch/keyboard/screen-reader and reduced-motion checks, representative concurrent jobs, failed leases/retries and a backup restore drill. Verify received email attachments/links in the inbox; a sent queue state only proves transport acceptance. Physical press/colour/cutting requirements and genuine merchant tax information need operator approval. Record private evidence outside the public source tree.

The 500-row offline render regression checks unique image output for every row and PNG/PDF geometry at rows 1, 250 and 500. This checks renderer correctness at the supported batch limit, not serverless throughput, concurrent-job capacity or physical print acceptance. Prisma schema parity and restricted-login RLS tests run against local SQL; connected deployment acceptance additionally verifies TLS and pooled actor isolation. See PRISMA.md.

## Automatic source-artwork acceptance

`check-source-journey.ts` is opt-in and requires CUSTOMER and SANDBOX test identities. It verifies private signed uploads, automatic preparation, cross-owner and forged-signature denial, original-file order capture, automatic payment-to-proof queuing and current approved PDF/PNG artifacts for PDF, PDF-compatible AI, SVG and PNG. It uses named synthetic payment fixtures, not a Stripe charge, and targets only its own order jobs. Its cleanup deletes its own storage/database records; no global queue or email dispatcher is invoked.

Source renderers run in a separate worker thread with a deadline, byte/pixel limits and bounded JS heap. SVG scripts, external resources, entities and animation are rejected; embedded fonts are supplied from the bundled font set. Single-page artwork is required. Illustrator files must include their standard PDF-compatible representation. Prepared pixels are signed server-side and must remain visible at checkout.

`check-archive-journey.ts` creates and removes 201 explicitly identified unpaid order fixtures and 101 saved designs. It verifies that order/customer/stage/product/India-day search is applied in the database across the full archive, that pagination keeps its filters, and that older designs remain accessible through both Prisma and Supabase reads. It never pays, renders or sends notifications.
