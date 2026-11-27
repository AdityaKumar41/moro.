# Acceptance coverage

Run the current suite rather than relying on historical test counts. Credential-free CI and isolated real-service acceptance are described in TESTING.md. Evidence containing customer information belongs outside the public repository.

| Requirement | Evidence in source | Limit |
| --- | --- | --- |
| Session/role isolation | http, database/RLS and Google-auth tests; server actor gates | Staff MFA and broader independent security review remain |
| Dynamic catalogue/instant quotes | catalogue schema, pricing/commerce tests and public smoke | Sample rates need merchant approval |
| Discounts and tax arithmetic | integer-money threshold tests | No statutory tax classification approval |
| Text/logo design within print area | geometry, image, print-preflight and command tests | Not a complete Canva-style editor |
| Saved/reusable artwork | resource/history/save-queue tests and opt-in studio acceptance | Multi-tab conflict and full expiry/device acceptance remain |
| Payment capture | signed event/session reconciliation and database replay/gate tests | CI does not charge Stripe; complete real test-mode hosted acceptance separately |
| CSV and print files | 36 family/layout/orientation cases plus a 500-row distinct-output render regression and PGlite tests | Hosted maximum-volume capacity and physical press/cutting certification remain |
| Proof version and customer approval | database stale-proof/payment/approval tests and pipeline smoke script | Representative source-file fidelity requires operator acceptance |
| Receipts and customer emails | PDF-generation/attachment/transport tests and authenticated service acceptance | SMTP at least once; domain/bounce/volume acceptance remains |
| Customer workspace/reorders | project-status/resources and service checks | Broader responsive/screen-reader matrix remains |
| Staff pipeline/downloads/reports | database gates and isolated service/pipeline checks | Operating roles, alerts and recovery drills remain |
| Real-work gallery | Six independent real-object photographs, one per required product family, filterable with creator/source/licence credits | Inspiration, not a claim of Moro customer commissions |
| CI/source delivery | GitHub workflow, lockfile, release guard, license and documentation | Passing CI is not manufacturing/enterprise certification |

Private checks have exercised hosted test payment/3DS, signed webhook updates, inbox delivery with PDF, saved-image/project reopening, proof revision/approval and email confirmation/recovery. The source release intentionally contains no account credentials, actual customer order IDs, exported receipts or deployed database records. Reproduce against your isolated project rather than treating those private checks as reusable fixtures.

The supplied PRD is retained privately as input context. Owner-approved variations include the Moro name, India/INR/GST configuration, the authorized hosting account and test-only payments. Requirements involving real tax identity, physical press/cutting output, enterprise infrastructure cannot be signed off by inventing data or relabelling a review deployment.
