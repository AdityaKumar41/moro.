# Prisma with Supabase

Prisma 7 supplies the typed model for all 12 public tables and the authenticated profile/design read paths. Supabase remains the database, identity provider and private object store. The checked-in SQL migrations own schema changes, RLS, triggers and transactional RPCs. Payment, proof, order and worker mutations continue to use those audited RPCs; adding an ORM does not replace their locking or authorization rules.

## Local development and CI

Use Node 22.12+ or Node 24 and `npm ci`. Postinstall generates `generated/prisma/`; generated code is ignored. `npm run db:generate` regenerates it and `npm run db:validate` validates the model. Both commands work without database credentials. CI validates the model and independently compares every public SQL column's name, type and nullability with the Prisma schema.

The Supabase-managed `auth` and `storage` schemas are intentionally not Prisma models. The profile's auth-user foreign key remains in SQL. All public tables are marked externally managed in Prisma config. Apply SQL migrations in filename order; do not run Prisma Migrate, db push or reset against this project. `DIRECT_URL` is an optional operator connection for inspection; it is never used by the application's runtime. Prisma CLI does not automatically load `.env.local`; explicitly load environment variables when running connected operator tools.

## Runtime connection

1. Apply `202611270008_prisma_read_role.sql`. It creates a non-login, non-superuser role without RLS bypass and grants existing authenticated read privileges. RLS policies still restrict each user's rows.
2. In the Supabase database Roles UI, enable login for `moro_prisma` and set a generated password privately. Leave superuser, role/database creation, replication and RLS bypass disabled. Never put the password in migration SQL or a saved SQL-editor snippet.
3. Set server-only `DATABASE_URL` using the project's **session pooler** host/port and username `moro_prisma.PROJECT_REF`; URL-encode the password. Use the pooler details displayed by your project. Do not substitute the postgres/service database login.
4. Download the database's root CA from Supabase Database Settings. Base64-encode its PEM bytes and set `DATABASE_SSL_CA_BASE64` in the host's secret settings. The adapter verifies the CA and hostname with TLS 1.2 or later; DSN parameters cannot downgrade verification. Public-CA deployments may omit the custom CA. Local loopback development may use a non-TLS database.
5. Restart/redeploy after changing these server variables. Each process uses a single pooled connection, with bounded connection and transaction timeouts.

Without DATABASE_URL, fresh installations retain the authenticated Supabase read implementation. With DATABASE_URL present, connection/authentication failures surface as errors, rather than silently switching database identities.

`withPrismaSession` accepts only the actor UUID obtained from verified Supabase Auth. Inside a transaction it rejects superuser, RLS-bypassing or order-write-capable connections, sets transaction-local JWT claims and runs the typed read. Claims disappear at transaction end, including pooled connection reuse. Never expose this helper to a request-supplied actor ID or set session-global claims.

Automated database tests cover owner reads, cross-owner denial and privilege escalation. Read-only hosted acceptance has additionally checked validated TLS, unscoped denial and eight interleaved owner sessions on a reused pool connection. Run connected acceptance only with isolated review accounts; no credentials or customer records belong in Git.
