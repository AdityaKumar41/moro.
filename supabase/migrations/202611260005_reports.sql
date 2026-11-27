create function public.admin_reports(p_actor uuid) returns jsonb language plpgsql security definer set search_path=public as $$declare result jsonb;begin
 if not exists(select 1 from profiles where id=p_actor and role='admin') then raise exception 'Admin required';end if;
 select jsonb_build_object('orders',count(*),'revenue',coalesce(sum(total) filter(where payment_status='paid'),0),'completed',count(*) filter(where status='completed'),'throughput',(select coalesce(jsonb_object_agg(product,n),'{}'::jsonb) from (select configuration->>'productId' as product,count(*) as n from orders where status='completed' group by configuration->>'productId') t)) into result from orders;
 return result;
end$$;
revoke execute on function public.admin_reports(uuid) from public,anon,authenticated;
grant execute on function public.admin_reports(uuid) to service_role;
