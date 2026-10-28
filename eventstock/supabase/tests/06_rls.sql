-- Isolation : avec le rôle "authenticated", un utilisateur ne voit que son entreprise
-- et ne peut pas écrire directement dans les tables protégées.
grant select on ctx to authenticated;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$
begin
  assert (select count(*) from public.reservations)=0, 'fuite : réservations visibles';
  assert (select count(*) from public.reservation_balances)=0, 'fuite : soldes visibles';
  assert (select count(*) from public.payments)=0, 'fuite : paiements visibles';
  assert (select count(*) from public.equipment)=0, 'fuite : matériel visible';
  raise notice 'OK 06_rls lecture isolée';
end $$;
reset role;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$
declare c ctx;
begin
  select * into c from ctx;
  assert (select count(*) from public.reservations)>0;
  assert (select count(*) from public.reservation_balances)>0;
  execute format('update public.equipment set quantity_total=999 where id=%L',c.eq);
  perform pg_temp.expect_error(format('insert into public.reservations(organization_id,customer_id,start_at,end_at) values(%L,%L,now(),now()+interval ''1 day'')',c.org,c.cust),'row-level security');
  perform pg_temp.expect_error(format('insert into public.payments(organization_id,reservation_id,amount,method,recorded_by) select %L,id,1,''cash'',auth.uid() from public.reservations limit 1',c.org),'row-level security');
  -- l'update est filtré silencieusement par RLS (0 ligne) ; on vérifie que rien n'a changé
  assert (select quantity_total from public.equipment where id=c.eq)=5, 'stock modifié en direct !';
  raise notice 'OK 06_rls écriture';
end $$;
reset role;
