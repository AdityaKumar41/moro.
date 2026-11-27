-- No password or LOGIN is committed. Provision the credential separately using
-- the secret store. Inherit only the existing authenticated SELECT/RLS boundary.
do $$begin
 if not exists(select 1 from pg_roles where rolname='moro_prisma') then
  create role moro_prisma nologin inherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
 end if;
end$$;
grant authenticated to moro_prisma;
grant usage on schema public,auth to moro_prisma;
-- Do not grant service_role, table ownership, BYPASSRLS or mutation privileges.
