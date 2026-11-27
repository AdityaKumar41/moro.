create table public.products(id text primary key,definition jsonb not null,active boolean not null default true,sort_order int not null default 100,updated_at timestamptz not null default now());
alter table public.products enable row level security;
create policy public_catalogue on products for select to anon,authenticated using(active);
grant select on products to anon,authenticated;
grant all on products to service_role;
create table public.templates(id uuid primary key default gen_random_uuid(),product_id text not null references products,name text not null,artwork jsonb not null,created_at timestamptz not null default now());
alter table public.templates enable row level security;
create policy template_read on templates for select to authenticated using(true);
grant select on templates to authenticated;
grant all on templates to service_role;
create function public.set_user_role(p_actor uuid,p_user uuid,p_role text) returns void language plpgsql security definer set search_path=public as $$begin
 lock table profiles in share row exclusive mode;
 if not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception 'Admin required';end if;
 if p_role not in ('admin','customer') then raise exception 'Invalid role';end if;
 if p_role='customer' and exists(select 1 from profiles where id=p_user and role='admin') and (select count(*) from profiles where role='admin')<=1 then raise exception 'Cannot remove the final administrator';end if;
 update profiles set role=p_role where id=p_user;
 insert into audit_events(actor_id,event,detail) values(p_actor,'user_role_changed',jsonb_build_object('user_id',p_user,'role',p_role));
end$$;
revoke execute on function public.set_user_role(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.set_user_role(uuid,uuid,text) to service_role;

insert into products(id,definition,sort_order) values ('labels','{"id":"labels","name":"Labels & stickers","short":"Labels","description":"Small details. Lasting impressions.","material":["Matte vinyl","Gloss vinyl","Paper"],"width":80,"height":80,"rate":32,"setup":1200,"color":"#d8ed94","shape":"label","approved":false}'::jsonb,0) on conflict do nothing;
insert into products(id,definition,sort_order) values ('race','{"id":"race","name":"Race & event numbers","short":"Race numbers","description":"Built for every personal best.","material":["Tyvek","Synthetic paper"],"width":210,"height":148,"rate":18,"setup":1800,"color":"#ffb69d","shape":"race","approved":false}'::jsonb,1) on conflict do nothing;
insert into products(id,definition,sort_order) values ('mtb','{"id":"mtb","name":"MTB boards","short":"MTB boards","description":"Made for the ride. Ready for the elements.","material":["Polypropylene","Rigid PVC"],"width":180,"height":150,"rate":35,"setup":2200,"color":"#b4cce9","shape":"mtb","approved":false}'::jsonb,2) on conflict do nothing;
insert into products(id,definition,sort_order) values ('stamps','{"id":"stamps","name":"Custom stamps","short":"Stamps","description":"Make your mark, again and again.","material":["Rubber","Self-inking"],"width":60,"height":30,"rate":250,"setup":1500,"color":"#d9c6ee","shape":"stamp","approved":false}'::jsonb,3) on conflict do nothing;
insert into products(id,definition,sort_order) values ('trophies','{"id":"trophies","name":"Trophies & awards","short":"Trophies","description":"For moments that deserve more.","material":["Acrylic","Bamboo"],"width":100,"height":180,"rate":320,"setup":3500,"color":"#f7d897","shape":"trophy","approved":false}'::jsonb,4) on conflict do nothing;
insert into products(id,definition,sort_order) values ('laser','{"id":"laser","name":"Laser-cut work","short":"Laser cut","description":"Precision in every possibility.","material":["Birch plywood","Acrylic"],"width":150,"height":150,"rate":180,"setup":2800,"color":"#cdb6a3","shape":"laser","approved":false}'::jsonb,5) on conflict do nothing;
create or replace function public.finish_job(p_job uuid,p_lease uuid,p_preview text default null) returns boolean language plpgsql security definer set search_path=public as $$declare j jobs;o orders;begin
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
