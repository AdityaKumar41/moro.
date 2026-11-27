create policy public_template_read on templates for select to anon using(true);
grant select on templates to anon;
-- Reclaim email deliveries after a crashed process. Provider idempotency keys suppress re-sends.
alter table notifications add column locked_until timestamptz;
create function public.claim_notifications() returns setof notifications language plpgsql security definer set search_path=public as $$begin
 return query update notifications set state='sending',attempts=attempts+1,locked_until=now()+interval '2 minutes' where id in (select id from notifications where (state='queued' or (state='sending' and locked_until<now())) and attempts<4 order by created_at for update skip locked limit 10) returning *;
end$$;
revoke execute on function public.claim_notifications() from public,anon,authenticated;
grant execute on function public.claim_notifications() to service_role;
