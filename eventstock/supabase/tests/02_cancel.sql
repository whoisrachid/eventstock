-- Étape 2 : annulation
do $$
declare c ctx; r1 uuid;
begin
  select * into c from ctx;
  perform pg_temp.as_user('11111111-1111-1111-1111-111111111111');
  r1 := public.create_confirmed_reservation(c.org,c.cust,c.d,c.d+interval '2 day',pg_temp.items(5));
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L)',c.org,c.cust,c.d,c.d+interval '1 day',pg_temp.items(1)),'Insufficient stock');
  -- staff et étranger ne peuvent pas annuler
  perform pg_temp.as_user('33333333-3333-3333-3333-333333333333');
  perform pg_temp.expect_error(format('select public.cancel_reservation(%L,%L)',c.org,r1),'Not authorized');
  perform pg_temp.as_user('22222222-2222-2222-2222-222222222222');
  perform pg_temp.expect_error(format('select public.cancel_reservation(%L,%L)',c.org,r1),'Not authorized');
  perform pg_temp.as_user('11111111-1111-1111-1111-111111111111');
  perform public.cancel_reservation(c.org,r1);
  assert (select status from public.reservations where id=r1)='cancelled';
  -- double annulation refusée
  perform pg_temp.expect_error(format('select public.cancel_reservation(%L,%L)',c.org,r1),'Only confirmed');
  -- le stock est libéré
  perform public.create_confirmed_reservation(c.org,c.cust,c.d,c.d+interval '1 day',pg_temp.items(5));
  raise notice 'OK 02_cancel';
end $$;
