-- Étape 3 : ajustement du stock
do $$
declare c ctx; e2 uuid;
begin
  select * into c from ctx;
  perform pg_temp.as_user('11111111-1111-1111-1111-111111111111');
  insert into public.equipment(organization_id,name,quantity_total,price_per_day) values(c.org,'Tables',10,2000) returning id into e2;
  -- 4 tables J20-J22, 3 tables J21-J23 -> pic 7 ; 6 tables J30-J31
  perform public.create_confirmed_reservation(c.org,c.cust,c.d+interval '20 day',c.d+interval '22 day',jsonb_build_array(jsonb_build_object('equipment_id',e2,'quantity',4)));
  perform public.create_confirmed_reservation(c.org,c.cust,c.d+interval '21 day',c.d+interval '23 day',jsonb_build_array(jsonb_build_object('equipment_id',e2,'quantity',3)));
  perform public.create_confirmed_reservation(c.org,c.cust,c.d+interval '30 day',c.d+interval '31 day',jsonb_build_array(jsonb_build_object('equipment_id',e2,'quantity',6)));
  assert public.equipment_peak_usage(c.org,e2,now(),'infinity')=7, 'pic attendu 7';
  perform pg_temp.expect_error(format('select public.update_equipment(%L,%L,%L,%s,%s)',c.org,e2,'Tables',6,2000),'Stock below commitments \(peak: 7\)');
  perform public.update_equipment(c.org,e2,'Tables rondes',7,2500);
  assert (select quantity_total from public.equipment where id=e2)=7;
  -- le prix des réservations existantes reste figé
  assert not exists(select 1 from public.reservation_items where equipment_id=e2 and unit_price<>2000);
  -- staff refusé, valeurs invalides refusées
  perform pg_temp.as_user('33333333-3333-3333-3333-333333333333');
  perform pg_temp.expect_error(format('select public.update_equipment(%L,%L,%L,%s,%s)',c.org,e2,'Tables',20,2000),'Not authorized');
  perform pg_temp.as_user('11111111-1111-1111-1111-111111111111');
  perform pg_temp.expect_error(format('select public.update_equipment(%L,%L,%L,%s,%s)',c.org,e2,'Tables',-1,2000),'Invalid quantity');
  -- stock à 7 : une nouvelle réservation de 1 sur J21 est refusée
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L)',c.org,c.cust,c.d+interval '21 day',c.d+interval '21 day 2 hour',jsonb_build_array(jsonb_build_object('equipment_id',e2,'quantity',1))),'Insufficient stock');
  assert exists(select 1 from public.audit_logs where action='equipment.updated');
  raise notice 'OK 03_stock';
end $$;
