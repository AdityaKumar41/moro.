# Database model

Supabase owns authentication users. Apply all `supabase/migrations/*.sql` in filename order to a new project. Migration files are the authoritative schema; this document describes the boundaries, not a production database dump.

| Table | Purpose and access |
| --- | --- |
| profiles | Auth-linked customer profile and staff role. Bootstrap trigger creates a customer profile. Customers cannot promote themselves. |
| products / templates | Extensible product definitions, print profiles and public reusable layouts. Writes require an authorized administrator. |
| designs | Private customer artwork/configuration with versioned resources (CSV data/source-upload metadata). Saves check the signed-in owner. |
| orders | Immutable ordered configuration/artwork/pricing, shipping, payment reference/status, current pipeline and approved proof. Customer reads are owner-scoped. |
| proofs | Versioned artwork snapshots, previews and customer approval identity/time. Superseding a proof invalidates old approval. |
| jobs | Leased, resumable proof/production render work with bounded retry attempts and error state. |
| artifacts | Private per-row PDF/PNG production paths. Paid, currently approved production is required for staff download. |
| notifications | Leased email outbox with kind/state/attempts and expiry. Delivery is at least once. |
| payment_events | Unique provider event IDs for replay protection and payment-event timestamps. |
| audit_events | Actor, order, event and bounded event detail for operational transitions. |
| request_limits | Server-consumed bounded rate limits. |

RLS applies to customer tables; privileged mutations are restricted to server/service-role functions. Keep service-role credentials out of clients. Functions perform their own ownership, role, payment and latest-proof checks; a role label in browser state is never authorization.

The artwork, proofs and production storage buckets are private. The server authorizes each download and issues short-lived signed links. Source upload paths must be owned by the current customer. Current output artifacts are selected against the approved proof, not simply the newest storage file.

Backup planning must include the database, authentication identities and storage objects. A schema migration alone cannot restore customer artwork or sender/payment settings. See OPERATIONS.md for restore acceptance and incident responsibilities.

The operations-health migration adds queue indexes plus service-role-only `operations_health` and `retry_notification` functions. Both validate the administrator actor; email retries lock failed rows, reset bounded attempts and write an audit event. Apply before the corresponding application revision.
