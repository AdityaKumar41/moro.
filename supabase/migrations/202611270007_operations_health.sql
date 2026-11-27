-- Service-role-only operational visibility and bounded, audited email recovery.
create index if not exists notifications_state_created_idx on public.notifications(state,created_at);
create index if not exists jobs_state_created_idx on public.jobs(state,created_at);

create function public.operations_health(p_actor uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin') then
  raise exception 'Administrator access required';
 end if;
 return jsonb_build_object(
  'checkedAt',now(),
  'jobs',(select jsonb_build_object(
    'queued',count(*) filter(where state='queued'),
    'active',count(*) filter(where state='running'),
    'failed',count(*) filter(where state='failed'),
    'expired',count(*) filter(where state='running' and locked_until<now()),
    'oldestQueuedAt',min(created_at) filter(where state='queued')) from jobs),
  'emails',(select jsonb_build_object(
    'queued',count(*) filter(where state='queued'),
    'active',count(*) filter(where state='sending'),
    'failed',count(*) filter(where state='failed'),
    'expired',count(*) filter(where state='sending' and locked_until<now()),
    'oldestQueuedAt',min(created_at) filter(where state='queued')) from notifications),
  'deliveries',coalesce((select jsonb_agg(to_jsonb(d)) from (
    select n.id,n.order_id,o.number as order_number,n.kind,n.state,n.attempts,n.created_at,n.locked_until
    from notifications n join orders o on o.id=n.order_id
    order by n.created_at desc,n.id limit 50
  ) d),'[]'::jsonb)
 );
end$$;
revoke execute on function public.operations_health(uuid) from public,anon,authenticated;
grant execute on function public.operations_health(uuid) to service_role;

create function public.retry_notification(p_actor uuid,p_notification uuid) returns void
language plpgsql security definer set search_path=public as $$
declare n notifications;
begin
 if not exists(select 1 from profiles where id=p_actor and role='admin') then
  raise exception 'Administrator access required';
 end if;
 select * into n from notifications where id=p_notification for update;
 if n.id is null or n.state<>'failed' then raise exception 'Only failed email deliveries can be retried';end if;
 if n.kind in ('payment_received','receipt_requested') and not exists(
  select 1 from orders where id=n.order_id and customer_id=n.customer_id and payment_status='paid'
 ) then raise exception 'Receipt requires a paid order';end if;
 update notifications set state='queued',attempts=0,locked_until=null where id=n.id;
 insert into audit_events(order_id,actor_id,event,detail)
 values(n.order_id,p_actor,'notification_retry_requested',jsonb_build_object('notification_id',n.id,'kind',n.kind,'previous_attempts',n.attempts));
end$$;
revoke execute on function public.retry_notification(uuid,uuid) from public,anon,authenticated;
grant execute on function public.retry_notification(uuid,uuid) to service_role;
