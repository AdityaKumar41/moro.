# Setup and deployment

Use a dedicated Supabase project, your own Stripe test account and your own sender. The source contains no configured service accounts or customer data.

## Supabase

1. Apply every SQL file in `supabase/migrations/` in filename order through the SQL editor or Supabase migration tooling. Do not replay the initial schema against an existing database. See DATABASE.md.
2. Copy your project's API URL/public anon key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Enable email/password authentication and email confirmation. Configure custom SMTP separately from the app's notification transport.
4. Set Site URL to your canonical HTTPS origin. Allow **exact** redirect URLs:
   - `https://YOUR_DOMAIN/auth/callback`
   - `https://YOUR_DOMAIN/auth/callback?next=/auth/reset`
5. For local email-flow testing, explicitly allow the corresponding `http://localhost:3000` callback URLs in the isolated test project. Do not use broad wildcard redirects. The callback uses APP_URL to avoid redirecting to an internal server hostname.
6. Create a verified account for each staff member. Promote the intended user explicitly with a reviewed SQL statement: `update public.profiles set role='admin' where id='<verified user UUID>';`. Staff cannot approve on behalf of a customer. Never ship shared administrator credentials.

## Prisma reads

For typed profile/design reads over the same Supabase database, configure the restricted session-pooler role and validated TLS described in [PRISMA.md](PRISMA.md). No data migration or replacement backend is needed. Do not use the database owner as the application ORM login.

## Google sign-in

Create a web OAuth client in your Google project, configure consent for basic identity scopes and add your Supabase project's exact `/auth/v1/callback` URL as the Google redirect URI. Configure the client ID/secret in the Supabase Google provider. Add the app's public origin as an authorized JavaScript origin where required. Keep identity email/nonce checks enabled. The app requests no Gmail or Drive access. Test provider cancellation and return-to-design behavior; publish consent only after the appropriate owner approval/verification.

## Stripe

Set `PAYMENTS_MODE=test`, `COMMERCE_ENABLED=false`, a test secret key and the signing secret for `/api/webhooks/stripe`. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded` and `charge.dispute.created`. The gateway verifies signatures and reconciles session ownership, checkout ID, amount and currency before changing paid state. See SANDBOX-PAYMENTS.md. Live-mode activation is a separate merchant decision.

## Email and workers

Set EMAIL_FROM and SMTP credentials or RESEND_API_KEY for app notifications. Use a dedicated sender appropriate for your volume; configure domain authentication and delivery monitoring. Supabase auth email has its own SMTP settings. Never commit app passwords.

Set a high-entropy WORKER_TOKEN. Adapt `scripts/install-worker-schedule.sql` to YOUR origin, create its Vault secret separately and review before executing. The SQL deliberately uses an example domain and no embedded token. Alternatively run `npm run worker` with the server environment in a durable Node container. Never start an infinite worker in a serverless request handler.

## Vercel

Import the repository into your authorized Vercel project and set its build environment, using Node 24. Configure all variables from `.env.example` in secret settings. APP_URL must be the canonical HTTPS origin; keys must match payment mode. Production secrets must not be available to untrusted fork previews. Run `npm run check:env` in the configured environment, apply migrations separately and exercise the complete design → paid test checkout → proof → approval → production workflow before release.

Changing the source repository does not transfer Supabase, Stripe, sender or domain ownership. Configure each integration for your own deployment and explicitly connect the correct repository in the hosting provider. CI does not deploy or migrate on its own.
