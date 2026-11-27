-- Replace the example origin with YOUR canonical HTTPS app before applying.
-- Create Vault secret moro_worker_token separately; match the app's WORKER_TOKEN.
-- Never paste the token into SQL or cron.job.command. Do not apply unchanged.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule(
  'moro-production-worker',
  '*/2 * * * *',
  $job$select net.http_get(
    url := 'https://YOUR_APP_DOMAIN.example/api/worker',
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (select decrypted_secret from vault.decrypted_secrets
       where name = 'moro_worker_token' limit 1)),
    timeout_milliseconds := 300000
  );$job$
);
select jobid, jobname, schedule, active from cron.job
where jobname = 'moro-production-worker';
