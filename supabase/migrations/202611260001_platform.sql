-- Run against a NEW Supabase project. All mutable commerce writes use server-only RPCs.
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users on delete cascade, name text not null default '', company text not null default '', gstin text not null default '', role text not null default 'customer' check(role in ('customer','admin')), created_at timestamptz not null default now());
create function public.new_profile() returns trigger language plpgsql security definer set search_path=public as $$begin insert into profiles(id,name) values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),100));return new;end$$;
create trigger on_signup after insert on auth.users for each row execute function public.new_profile();
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;
create table public.designs(id uuid primary key default gen_random_uuid(),customer_id uuid not null references profiles, name text not null, configuration jsonb not null, artwork jsonb not null, created_at timestamptz not null default now());
create table public.orders(id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique, customer_id uuid not null references profiles, request_key uuid not null, configuration jsonb not null, artwork jsonb not null, variable_data jsonb not null default '[]', upload_path text, pricing jsonb not null, total bigint not null check(total>0), currency text not null, shipping jsonb not null, status text not null default 'quote' check(status in ('quote','order','artwork','proof','production','completed')), payment_status text not null default 'unpaid' check(payment_status in ('unpaid','paid','refunded','disputed')), payment_ref text, checkout_id text, checkout_url text, approved_proof_id uuid, created_at timestamptz not null default now(), unique(customer_id,request_key));
create table public.proofs(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders,version int not null,artwork jsonb not null, state text not null default 'rendering' check(state in ('rendering','ready','approved','changes_requested','superseded')), preview_path text, approved_by uuid references profiles, approved_at timestamptz, comment text, created_at timestamptz not null default now(),unique(order_id,version));
alter table public.orders add constraint approved_proof_fk foreign key(approved_proof_id) references proofs;
create table public.artifacts(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders,proof_id uuid not null references proofs,path text not null unique,kind text not null check(kind in ('pdf','png')),row_number int not null,sha256 text not null,created_at timestamptz not null default now());
create table public.audit_events(id bigint generated always as identity primary key,order_id uuid references orders,actor_id uuid references profiles,event text not null,detail jsonb not null default '{}',created_at timestamptz not null default now());
create table public.jobs(id uuid primary key default gen_random_uuid(),order_id uuid not null references orders,proof_id uuid not null references proofs,kind text not null check(kind in ('proof','production')),state text not null default 'queued' check(state in ('queued','running','done','failed')),attempts int not null default 0,locked_until timestamptz,lease_id uuid, last_error text,created_at timestamptz not null default now(),unique(proof_id,kind));
create table public.notifications(id uuid primary key default gen_random_uuid(),customer_id uuid not null references profiles,order_id uuid not null references orders,kind text not null,state text not null default 'queued',attempts int not null default 0,created_at timestamptz not null default now());
create table public.payment_events(id text primary key,order_id uuid not null references orders,created_at timestamptz not null default now());
create table public.rate_limits(key text primary key,window_start timestamptz not null, count int not null);
create index orders_customer_created on public.orders(customer_id,created_at desc);
create index orders_pipeline on public.orders(status,created_at desc);
create index jobs_queue on public.jobs(state,created_at);
create index proofs_order on public.proofs(order_id,version desc);

alter table public.profiles enable row level security;
alter table public.designs enable row level security;
alter table public.orders enable row level security;
alter table public.proofs enable row level security;
alter table public.artifacts enable row level security;
alter table public.audit_events enable row level security;
alter table public.jobs enable row level security;
alter table public.notifications enable row level security;
alter table public.payment_events enable row level security;
alter table public.rate_limits enable row level security;
create policy profile_read on profiles for select to authenticated using(id=auth.uid() or is_admin());
create policy design_read on designs for select to authenticated using(customer_id=auth.uid() or is_admin());
create policy order_read on orders for select to authenticated using(customer_id=auth.uid() or is_admin());
create policy proof_read on proofs for select to authenticated using(exists(select 1 from orders where orders.id=proofs.order_id and (orders.customer_id=auth.uid() or is_admin())));
create policy artifact_admin on artifacts for select to authenticated using(is_admin());
create policy audit_admin on audit_events for select to authenticated using(is_admin());
-- No direct client INSERT / UPDATE / DELETE policies. In particular, role cannot be self-assigned.
revoke all on all tables in schema public from anon,authenticated;
grant select on profiles,designs,orders,proofs,artifacts,audit_events to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

create function public.consume_rate_limit(p_key text,p_limit int) returns boolean language plpgsql security definer set search_path=public as $$declare n int;begin insert into rate_limits as r values(p_key,date_trunc('minute',now()),1) on conflict(key) do update set window_start=date_trunc('minute',now()),count=case when r.window_start=date_trunc('minute',now()) then r.count+1 else 1 end returning count into n;return n<=p_limit;end$$;

create function public.order_action(p_order uuid,p_actor uuid,p_action text,p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare o orders; p proofs; admin boolean; next_stage text; next_version int;
begin
 if p_actor is null or not exists(select 1 from profiles where id=p_actor) then raise exception 'Actor required';end if;
 select * into o from orders where id=p_order for update;
 if o.id is null then raise exception 'Order not found'; end if;
 select role='admin' into admin from profiles where id=p_actor;
 if o.customer_id<>p_actor and not coalesce(admin,false) then raise exception 'Forbidden';end if;
 if p_action='publish_proof' then
  if not admin or o.payment_status<>'paid' or o.status in ('production','completed') then raise exception 'Cannot publish proof';end if;
  if exists(select 1 from jobs where order_id=o.id and state='running') then raise exception 'Rendering in progress';end if;
  select coalesce(max(version),0)+1 into next_version from proofs where order_id=o.id;
  update proofs set state='superseded' where order_id=o.id and state in ('ready','approved','rendering');
  insert into proofs(order_id,version,artwork) values(o.id,next_version,p_payload->'artwork') returning * into p;
  update orders set status='proof',approved_proof_id=null where id=o.id;
  insert into jobs(order_id,proof_id,kind) values(o.id,p.id,'proof');
 elsif p_action in ('approve','changes') then
  if o.customer_id<>p_actor or o.payment_status<>'paid' or o.status<>'proof' then raise exception 'Customer approval required';end if;
  select * into p from proofs where id=(p_payload->>'proofId')::uuid and order_id=o.id for update;
  if p.id is null or p.state<>'ready' or p.version<>(select max(version) from proofs where order_id=o.id) then raise exception 'Proof is no longer current';end if;
  if p_action='approve' then
   update proofs set state='approved',approved_by=p_actor,approved_at=now() where id=p.id;
   update orders set approved_proof_id=p.id where id=o.id;
   insert into jobs(order_id,proof_id,kind) values(o.id,p.id,'production') on conflict do nothing;
  else
   update proofs set state='changes_requested',comment=left(p_payload->>'comment',2000) where id=p.id;
  end if;
 elsif p_action='advance' then
  if not admin or o.payment_status<>'paid' then raise exception 'Paid admin order required';end if;
  next_stage=case o.status when 'order' then 'artwork' when 'artwork' then null when 'proof' then 'production' when 'production' then 'completed' else null end;
  if next_stage is null then raise exception 'Publish a proof before advancing';end if;
  if next_stage in ('production','completed') and (o.approved_proof_id is null or not exists(select 1 from jobs where proof_id=o.approved_proof_id and kind='production' and state='done')) then raise exception 'Approved production files required';end if;
  update orders set status=next_stage where id=o.id;
  insert into notifications(customer_id,order_id,kind) values(o.customer_id,o.id,next_stage);
 else raise exception 'Unknown action';end if;
 insert into audit_events(order_id,actor_id,event,detail) values(o.id,p_actor,p_action,jsonb_build_object('proof_id',p.id,'status',next_stage));
 return jsonb_build_object('ok',true,'proofId',p.id);
end$$;

create function public.apply_payment(p_event text,p_order uuid,p_reference text,p_amount bigint,p_currency text,p_checkout text,p_state text default 'paid') returns void language plpgsql security definer set search_path=public as $$declare o orders;begin
 select * into o from orders where id=p_order for update;
 if o.id is null or o.total<>p_amount or lower(o.currency)<>lower(p_currency) or o.checkout_id is distinct from p_checkout then raise exception 'Payment mismatch';end if;
 if exists(select 1 from payment_events where id=p_event) then return;end if;
 insert into payment_events(id,order_id) values(p_event,p_order);
 if p_state='paid' and o.payment_status='unpaid' then
  update orders set payment_status='paid',payment_ref=p_reference,status='order' where id=o.id;
  insert into notifications(customer_id,order_id,kind) values(o.customer_id,o.id,'payment_received');
  if o.upload_path is null and exists(select 1 from profiles where role='admin') then perform order_action(o.id,(select id from profiles where role='admin' order by created_at limit 1),'publish_proof',jsonb_build_object('artwork',o.artwork));end if;
 elsif p_state in ('refunded','disputed') then update orders set payment_status=p_state where id=o.id;end if;
 insert into audit_events(order_id,event,detail) values(o.id,'payment_'||p_state,jsonb_build_object('reference',p_reference));
end$$;

create function public.claim_job() returns setof jobs language plpgsql security definer set search_path=public as $$begin return query update jobs set state='running',attempts=attempts+1,locked_until=now()+interval '10 minutes',lease_id=gen_random_uuid() where id=(select id from jobs where (state='queued' or (state='running' and locked_until<now())) and attempts<4 order by created_at for update skip locked limit 1) returning *;end$$;
create function public.finish_job(p_job uuid,p_lease uuid,p_preview text default null) returns boolean language plpgsql security definer set search_path=public as $$declare j jobs;o orders;begin
 select * into j from jobs where id=p_job for update;
 if j.id is null or j.state<>'running' or j.lease_id<>p_lease or j.locked_until<now() then return false;end if;
 select * into o from orders where id=j.order_id for update;
 if j.kind='proof' then
  update proofs set state='ready',preview_path=p_preview where id=j.proof_id and state='rendering';
  if found then insert into notifications(customer_id,order_id,kind) values(o.customer_id,o.id,'proof_ready');end if;
 elsif o.approved_proof_id is distinct from j.proof_id or o.payment_status<>'paid' then raise exception 'Approval changed';end if;
 update jobs set state='done',locked_until=null where id=j.id;
 return true;
end$$;

-- Functions are never callable with the public anon / customer keys.
revoke execute on all functions in schema public from public,anon,authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on all functions in schema public to service_role;

-- Private objects. Downloads are authorized per request by the application.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('artwork','artwork',false,20971520,array['application/pdf','image/svg+xml','application/postscript','image/png']),
 ('proofs','proofs',false,20971520,array['image/png']),
 ('production','production',false,104857600,array['application/pdf','image/png']) on conflict(id) do nothing;
