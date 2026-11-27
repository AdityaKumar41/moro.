# Release plan

## Engineering and acceptance

1. Keep public CI green: clean installation, Node 22/24, types, unit/database/render tests, production build, public route smoke, dependency and source-release checks. Run CodeQL and review dependency updates.
2. Complete production email/auth/device acceptance: confirmation, recovery, Google cancellation/return, sign-out, expiry during save, Back navigation and delayed/failed checkout. Preserve drafts and show progress/retry states.
3. Exercise six families, portrait/landscape/square output, supported fonts, transparent/max-size images, source attachments and 500 CSV rows. Test keyboard/touch/screen reader, 200% zoom and reduced motion.
4. Measure concurrent quotes/checkouts/jobs and failure recovery against intended infrastructure. Establish capacity and recovery targets, queue/error alerts and an operational owner.
5. Require individual staff MFA and audit review. Configure backup retention and perform an isolated database/auth/storage restore with integrations disabled before re-enabling queues.

## Owner/operator inputs

- An approved real-work image library with publication rights and useful descriptions. Until supplied, keep concepts labelled.
- Actual manufacturing samples and print/cut/colour requirements for each family/material. Current raster RGB files are not certified machine toolpaths or PDF/X/CMYK output.
- A sending domain and volume, authenticated transactional sender and bounce/delivery monitoring.
- Genuine legal/GST identity, approved prices/HSN/tax/delivery/refund terms, merchant readiness and fulfilment sign-off for any future real-money launch. Real payments remain deliberately disabled.

## Future extensions

Corporate/multi-account ordering, a native mobile app and full Xero OAuth/mapping/reconciliation are future integrations, not silently completed features. Current APIs, product/templates and accounting CSV provide extension seams.

Completed repairs include cloud autosave, independent checkout-to-project persistence, serialized saves and save barriers, emailed PDF receipts with targeted resend, and configured-origin auth callbacks. Keep open acceptance explicit; a checklist entry is complete only when the corresponding deployed/physical scenario passes.

Staff service-health snapshots and audited failed-email retry are now implemented with database role/payment/concurrency gates. This improves operational visibility but does not close external alert delivery, worker heartbeat monitoring, MFA or backup restore acceptance.
