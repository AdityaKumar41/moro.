# Product readiness

Moro is a transactional web-to-print platform for India/INR/GST, with Stripe kept in test mode. This public summary describes behavior and remaining acceptance; private customer/deployment evidence and the original assignment PDF are not distributed.

| Area | Implemented behavior | Remaining acceptance |
| --- | --- | --- |
| Catalogue/pricing | Six parameter-driven families; materials/sizes/quantity, integer pricing, volume discounts and tax totals | Merchant-approved prices/tax/terms before real trading |
| Designer | Templates, text/fonts/colour, images, move/resize/rotate, physical constraints, keyboard/inline editing, layers/history and cloud autosave | Wider touch/device/accessibility and maximum-document tests; advanced grouping/cropping is not claimed |
| Saved projects | Owner-checked serialized save, save before exit/checkout, server order-to-design persistence, source/CSV resource recovery | Multi-tab/version-conflict acceptance and wider session-expiry cases |
| Checkout | Hosted test Checkout, signature/ownership/amount reconciliation, replay protection, bounded feedback/retry | Region-appropriate fixtures and full hosted return/cancellation matrix for each deployment |
| Proofs/production | Versioned previews, customer approval, revision invalidation, paid/current-proof production gates, per-row PDF/PNG | Actual source-file/operator/press/cutting/colour acceptance |
| Accounts | Email confirmation/password recovery, Google PKCE, profile, history, reorder and private receipts | Wider production/device/session-expiry matrix |
| Email | Payment PDF attachment, requested receipt resend and bounded leased delivery | Branded domain/volume/bounce acceptance and operational alert ownership |
| Staff tools | Product/template/user roles, job pipeline, current artifact downloads and reporting | Service health/failed-email recovery are implemented; individual staff MFA, broader security review and operating drills |
| UI | Shared Moro theme, focused studio, skeletons, feedback and responsive samples | Full device/screen-reader/200% zoom acceptance and approved real-work library |
| Operations | Restricted server APIs, RLS/private storage, leased jobs/outbox, dependency tests and CI | Load/capacity targets, alerts, retention and verified backup restoration |

A real missing-project issue was repaired by persisting artwork independently of checkout's order snapshot and adding authenticated autosave/save barriers. Receipt emails now attach the generated payment PDF. A callback-origin regression was reproduced and fixed so internal runtime hostnames cannot redirect recovery away from the configured app origin. Tests cover these behaviors; they do not substitute for full external integration or physical manufacturing acceptance.

The current PDF is a payment receipt, not a statutory GST invoice based on placeholder business details. Current production PDFs are raster RGB artwork, not certified PDF/X, CMYK separations or laser toolpaths. Concepts are not presented as real customer work. Future corporate/multi-account ordering, a native mobile app and full Xero OAuth/sync remain extensions; the accounting CSV/seams do not implement them.

See [acceptance coverage](PRD-ACCEPTANCE.md), [testing](TESTING.md) and [release plan](RELEASE-PLAN.md). Complete the remaining checks against the intended deployment and manufacturing process before enterprise launch sign-off.
