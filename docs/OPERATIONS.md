# Operations

## Worker and delivery

Use a scheduled authenticated `GET /api/worker` or a durable Node worker. Requests require `Authorization: Bearer <WORKER_TOKEN>`; admin interactive execution also requires a staff session and same-origin request. The job worker uses row locks, expiring leases and resumable batches. Failed work retries four times; operators must resolve the error before retrying it. Do not run multiple unrelated deployments against the same queue without a capacity plan.

Adapt `scripts/install-worker-schedule.sql` to your canonical origin. Keep the worker token in Vault/hosting secret storage, never SQL source or cron command text. Check actual HTTP responses and job/outbox state: a scheduled HTTP request being accepted is not proof that rendering or email succeeded.

Payment notifications attach the same branded PDF receipt as the authenticated account download. Email receipt requests check ownership, paid state, UUID replay and rate limits. A targeted lease avoids processing unrelated mail during a resend. The account email is the recipient; callers cannot specify another recipient. Queued delivery falls back to cron and retries are bounded.

SMTP has at-least-once semantics: a delivery followed by a lost acknowledgement can be retried. Stable Message-IDs help correlation, not guaranteed exactly-once delivery. Resend additionally receives an idempotency key. Verify the actual inbox attachment and public account link. Local .env files may use localhost; explicitly choose the intended public APP_URL when testing received email.

## Incident checks

- Review failed/stuck render work, notification retries and oldest queued age. Record provider errors privately without credentials or unnecessary personal data.
- Confirm current proof approval and paid state before retrying production. Never manually mark a customer paid to recover a checkout error.
- For a leaked credential, rotate it at its provider, update the secret store and redeploy. Rotate the cron Vault secret together with WORKER_TOKEN. A Git deletion cannot revoke a leaked key.
- Track refund/dispute events; production access is conservatively locked when payment is no longer paid.
- Use individual staff identities, MFA and reviewed role changes. Establish queue/error alerting with an operator and an escalation path.

## Backup and recovery

Choose retention/RPO/RTO appropriate to your business. Back up database/auth/storage using provider-supported tooling; never commit snapshots, dumps or storage exports. Restore into an isolated project first. Verify schema/function grants, RLS, authentication, storage ownership, saved designs, proof history and current artifacts. Keep Stripe, SMTP and dispatch disabled while validating restoration; replaying old queues can resend messages or repeat manufacturing work. Record the successful restore evidence and timings privately before claiming recovery acceptance.

## Capacity and launch

Measure simultaneous quotes/checkouts and maximum CSV/render jobs with your actual instance/worker limits. Establish queue-latency, storage, email-volume and failure budgets. Free review resources are not an enterprise SLA. Domain-authenticated mail, staff MFA, actionable alerts, backup retention/restore tests, physical manufacturing sign-off and genuine commercial settings remain operator launch responsibilities.
