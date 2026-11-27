-- Prepared uploads use the same automatic, versioned proof queue as canvas designs.
-- The server verifies the source signature and visible image before order capture.
-- Legacy, unprepared attachments retain their manual gate.
create or replace function public.apply_payment(p_event text,p_order uuid,p_reference text,p_amount bigint,p_currency text,p_checkout text,p_state text default 'paid') returns void language plpgsql security definer set search_path=public as $$declare o orders; proof_id uuid;begin
 select * into o from orders where id=p_order for update;
 if o.id is null or o.total<>p_amount or lower(o.currency)<>lower(p_currency) or o.checkout_id is distinct from p_checkout then raise exception 'Payment mismatch';end if;
 if exists(select 1 from payment_events where id=p_event) then return;end if;
 insert into payment_events(id,order_id) values(p_event,p_order);
 if p_state='paid' and o.payment_status='unpaid' then
  update orders set payment_status='paid',payment_ref=p_reference,status='order' where id=o.id;
  insert into notifications(customer_id,order_id,kind) values(o.customer_id,o.id,'payment_received');
  if o.upload_path is null or (o.artwork->'source'->>'path'=o.upload_path and o.artwork->'source'->>'version'='1') then
   insert into proofs(order_id,version,artwork) values(o.id,1,o.artwork) returning id into proof_id;
   update orders set status='proof' where id=o.id;
   insert into jobs(order_id,proof_id,kind) values(o.id,proof_id,'proof');
   insert into audit_events(order_id,event,detail) values(o.id,'automatic_proof_queued',jsonb_build_object('proof_id',proof_id));
  end if;
 elsif p_state in ('refunded','disputed') then update orders set payment_status=p_state where id=o.id;end if;
 insert into audit_events(order_id,event,detail) values(o.id,'payment_'||p_state,jsonb_build_object('reference',p_reference));
end$$;

-- Target one order without claiming unrelated customer work. Service credentials
-- are still required; regular customer/admin JWTs cannot execute this RPC.
create function public.claim_order_job(p_order uuid) returns setof jobs language plpgsql security definer set search_path=public as $$begin
 return query update jobs set state='running',attempts=attempts+1,locked_until=now()+interval '10 minutes',lease_id=gen_random_uuid()
 where id=(select id from jobs where order_id=p_order and (state='queued' or (state='running' and locked_until<now())) and attempts<4 order by created_at for update skip locked limit 1) returning *;
end$$;
revoke execute on function public.claim_order_job(uuid) from public,anon,authenticated;
grant execute on function public.claim_order_job(uuid) to service_role;
