-- Données de test communes : 2 utilisateurs, 2 entreprises, 1 client, 1 équipement de 5 unités.
insert into auth.users values
 ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222'),('33333333-3333-3333-3333-333333333333');
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('request.jwt.claim.sub',u,false) $$;
create function pg_temp.expect_error(sql text, pattern text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'ECHEC: aucune erreur pour %', sql;
exception when others then
  if sqlerrm like 'ECHEC:%' then raise; end if;
  if sqlerrm !~* pattern then raise exception 'ECHEC: erreur inattendue "%" (attendu %)', sqlerrm, pattern; end if;
end $$;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
create temp table ctx as
select public.create_organization('Loc Test') as org;
insert into public.customers(organization_id,name) select org,'Client A' from ctx;
insert into public.equipment(organization_id,name,quantity_total,price_per_day) select org,'Chaises',5,500 from ctx;
alter table ctx add column cust uuid, add column eq uuid, add column d timestamptz;
update ctx set cust=(select id from public.customers limit 1), eq=(select id from public.equipment limit 1),
  d=date_trunc('day',now())+interval '10 day';
-- 3e utilisateur : membre "staff" de la même entreprise
insert into public.memberships select org,'33333333-3333-3333-3333-333333333333','staff' from ctx;
create function pg_temp.items(q int) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object('equipment_id',(select eq from ctx),'quantity',q)) $$;
