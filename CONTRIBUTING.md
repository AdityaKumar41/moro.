# Contributing

Use Node 24 LTS, run `npm ci`, and work on a branch. Read AGENTS.md before changing Next.js code; this project uses the installed Next.js version's bundled documentation.

Keep changes scoped and include regression coverage for meaningful behavior changes. Run `npm run typecheck`, `npm test`, `npm run build`, `npm run check:public` and `npm run check:release`. CI repeats these checks without production credentials. Explain the user-visible change, validation and remaining limitations in the pull request.

Use integer minor units for money. Validate on the server, preserve ownership/RLS gates, and use immutable order/proof snapshots for manufacturing. Do not derive paid state from browser redirects, allow staff to approve on a customer's behalf, or expose production object URLs before authorization.

Never commit `.env` files, account credentials, provider tokens, database exports, customer artwork or receipt PDFs. Use synthetic fixtures and the placeholders in example environment files. Do not run a real-service acceptance script against someone else's deployment or account. A test can mutate, send mail or trigger print generation; read its setup instructions first.

Commit messages should describe one coherent change, for example `fix(studio): persist a design before checkout`. Changes to migrations should be additive, tested against the database suite and applied separately by an authorized operator. Opening a pull request does not authorize deploying it or migrating a live database.

Report security problems privately as described in SECURITY.md. For bugs, include reproducible steps and expected behavior; redact credentials and personal customer information.
