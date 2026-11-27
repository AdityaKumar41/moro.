# Security policy

The main branch is the currently maintained development line. This project is under active acceptance and does not promise enterprise certification or an incident-response SLA.

Use GitHub's **Security → Advisories → Report a vulnerability** for a private report when available. If private reporting is unavailable, open a minimal issue asking for a private reporting channel without publishing the exploit, credentials or customer information. Do not include sensitive findings in a public issue or pull request.

Include the affected commit, a minimal synthetic reproduction, expected impact and any proposed fix. Test only systems and accounts you own or are authorized to assess. Do not send real payments or enumerate real customer records.

## Deployment responsibilities

- Store service-role, payment, webhook, worker and mail credentials in a secret store. Client-visible Supabase anon keys still require correctly deployed RLS.
- Apply all migrations in order, keep storage private, and preserve signature/amount/ownership checks at payment boundaries.
- Give staff individual accounts, enable MFA as required by your operating policy and review role changes.
- Configure a suitable transactional sender, delivery monitoring, queue alerts, backups and a tested restore plan.
- Keep Stripe in test mode until genuine business/tax/fulfilment details and the launch gates are approved.

CI checks dependencies, source-release exclusions and CodeQL findings. Automated checks do not replace independent security review, penetration testing, backup restoration or manufacturing acceptance.
