-- Simule le schéma auth de Supabase pour tester les migrations sur un Postgres local.
-- NE PAS exécuter sur un vrai projet Supabase.
create schema auth; create table auth.users(id uuid primary key);
do $$ begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; create role anon; end if; end $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
-- Comme Supabase : les rôles API ont des droits sur les tables, filtrés ensuite par les règles RLS.
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated, anon;
alter default privileges in schema public grant all on sequences to authenticated, anon;
