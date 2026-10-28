-- Étape 5 : paiements
do $$
declare c ctx; r uuid; p1 uuid; p2 uuid;
begin
  select * into c from ctx;
  perform pg_temp.as_user('11111111-1111-1111-1111-111111111111');
  -- 2 chaises x 500 x 2 jours = 2000 + 1000 transport = 3000
  r := public.create_confirmed_reservation(c.org,c.cust,c.d+interval '90 day',c.d+interval '92 day',pg_temp.items(2),null,1000,0,'');
  assert (select balance from public.reservation_balances where reservation_id=r)=3000;
  p1 := public.record_payment(c.org,r,1000,'wave','TX123');
  p2 := public.record_payment(c.org,r,1500,'orange_money');
  assert (select paid from public.reservation_balances where reservation_id=r)=2500;
  perform pg_temp.expect_error(format('select public.record_payment(%L,%L,%s,%L)',c.org,r,501,'cash'),'Payment exceeds balance \(balance: 500\)');
  perform pg_temp.expect_error(format('select public.record_payment(%L,%L,%s,%L)',c.org,r,0,'cash'),'Invalid amount');
  perform pg_temp.expect_error(format('select public.record_payment(%L,%L,%s,%L)',c.org,r,10,'bitcoin'),'Invalid payment method');
  -- staff : ni encaisser ni annuler
  perform pg_temp.as_user('33333333-3333-3333-3333-333333333333');
  perform pg_temp.expect_error(format('select public.record_payment(%L,%L,%s,%L)',c.org,r,10,'cash'),'Not authorized');
  perform pg_temp.expect_error(format('select public.void_payment(%L,%L)',c.org,p1),'Not authorized');
  -- annulation d'un paiement par le propriétaire : le reste à payer remonte
  perform pg_temp.as_user('11111111-1111-1111-1111-111111111111');
  perform public.void_payment(c.org,p1);
  perform pg_temp.expect_error(format('select public.void_payment(%L,%L)',c.org,p1),'already voided');
  assert (select balance from public.reservation_balances where reservation_id=r)=1500;
  perform public.record_payment(c.org,r,1500,'mtn_momo');
  assert (select balance from public.reservation_balances where reservation_id=r)=0;
  -- réservation annulée : plus d'encaissement possible
  perform public.cancel_reservation(c.org,r);
  perform pg_temp.expect_error(format('select public.record_payment(%L,%L,%s,%L)',c.org,r,1,'cash'),'Reservation cancelled');
  -- utilisateur étranger
  perform pg_temp.as_user('22222222-2222-2222-2222-222222222222');
  perform pg_temp.expect_error(format('select public.record_payment(%L,%L,%s,%L)',c.org,r,1,'cash'),'Not authorized');
  raise notice 'OK 05_payments';
end $$;
