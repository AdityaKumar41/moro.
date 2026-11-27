-- Automated payment processing is attributed to the system, never an arbitrary staff identity.
create or replace function public.apply_payment(p_event text,p_order uuid,p_reference text,p_amount bigint,p_currency text,p_checkout text,p_state text default 'paid') returns void language plpgsql security definer set search_path=public as $$declare o orders; proof_id uuid;begin
 select * into o from orders where id=p_order for update;
 if o.id is null or o.total<>p_amount or lower(o.currency)<>lower(p_currency) or o.checkout_id is distinct from p_checkout then raise exception 'Payment mismatch';end if;
 if exists(select 1 from payment_events where id=p_event) then return;end if;
 insert into payment_events(id,order_id) values(p_event,p_order);
 if p_state='paid' and o.payment_status='unpaid' then
  update orders set payment_status='paid',payment_ref=p_reference,status='order' where id=o.id;
  insert into notifications(customer_id,order_id,kind) values(o.customer_id,o.id,'payment_received');
  if o.upload_path is null then
   insert into proofs(order_id,version,artwork) values(o.id,1,o.artwork) returning id into proof_id;
   update orders set status='proof' where id=o.id;
   insert into jobs(order_id,proof_id,kind) values(o.id,proof_id,'proof');
   insert into audit_events(order_id,event,detail) values(o.id,'automatic_proof_queued',jsonb_build_object('proof_id',proof_id));
  end if;
 elsif p_state in ('refunded','disputed') then update orders set payment_status=p_state where id=o.id;end if;
 insert into audit_events(order_id,event,detail) values(o.id,'payment_'||p_state,jsonb_build_object('reference',p_reference));
end$$;
