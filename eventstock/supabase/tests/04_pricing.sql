-- Étape 4 : anti-surbooking (scénarios de chevauchement) + calcul du montant
do $$
declare c ctx; e3 uuid; e4 uuid; r uuid; rec record;
begin
  select * into c from ctx;
  perform pg_temp.as_user('11111111-1111-1111-1111-111111111111');
  insert into public.equipment(organization_id,name,quantity_total,price_per_day) values(c.org,'Bâches',5,10000) returning id into e3;
  insert into public.equipment(organization_id,name,quantity_total,price_per_day) values(c.org,'Sono',2,25000) returning id into e4;
  -- Chevauchements : A J41-J43 x3, B J42-J44 x2 (pic 5 sur J42-J43)
  perform public.create_confirmed_reservation(c.org,c.cust,c.d+interval '41 day',c.d+interval '43 day',jsonb_build_array(jsonb_build_object('equipment_id',e3,'quantity',3)));
  perform public.create_confirmed_reservation(c.org,c.cust,c.d+interval '42 day',c.d+interval '44 day',jsonb_build_array(jsonb_build_object('equipment_id',e3,'quantity',2)));
  -- C adjacente à A (J43-J45 x3) : acceptée
  perform public.create_confirmed_reservation(c.org,c.cust,c.d+interval '43 day',c.d+interval '45 day',jsonb_build_array(jsonb_build_object('equipment_id',e3,'quantity',3)));
  -- D englobante x1 : refusée
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L)',c.org,c.cust,c.d+interval '40 day',c.d+interval '50 day',jsonb_build_array(jsonb_build_object('equipment_id',e3,'quantity',1))),'Insufficient stock');
  -- E J41.5-J41.8 x2 (seulement A en cours) : acceptée ; F J40-J41.6 x1 : refusée (pic 5 à J41.5)
  perform public.create_confirmed_reservation(c.org,c.cust,c.d+interval '41 day 12 hour',c.d+interval '41 day 19 hour',jsonb_build_array(jsonb_build_object('equipment_id',e3,'quantity',2)));
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L)',c.org,c.cust,c.d+interval '40 day',c.d+interval '41 day 14 hour',jsonb_build_array(jsonb_build_object('equipment_id',e3,'quantity',1))),'Insufficient stock');
  -- Réservation multi-lignes, 49 h -> 3 jours : (5 x 500 + 1 x 25000) x 3 = 82 500 ; + 5 000 transport - 2 500 remise = 85 000
  r := public.create_confirmed_reservation(c.org,c.cust,c.d+interval '60 day',c.d+interval '62 day 1 hour',
        jsonb_build_array(jsonb_build_object('equipment_id',c.eq,'quantity',5),jsonb_build_object('equipment_id',e4,'quantity',1)),
        null,5000,2500,'Cocody, Riviera 2');
  select * into rec from public.reservations where id=r;
  assert rec.billed_days=3, 'jours attendus 3, obtenu '||rec.billed_days;
  assert rec.subtotal=82500 and rec.total=85000 and rec.event_location='Cocody, Riviera 2', 'montant incorrect '||rec.total;
  assert (select count(*) from public.reservation_items where reservation_id=r)=2;
  -- Jours forcés à 1 (tarif week-end)
  r := public.create_confirmed_reservation(c.org,c.cust,c.d+interval '70 day',c.d+interval '72 day',pg_temp.items(2),1,0,0,'');
  assert (select total from public.reservations where id=r)=1000;
  -- Remise trop forte, jours invalides, transport négatif : refusés
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L,null,0,999999)',c.org,c.cust,c.d+interval '80 day',c.d+interval '81 day',pg_temp.items(1)),'Discount exceeds total');
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L,0)',c.org,c.cust,c.d+interval '80 day',c.d+interval '81 day',pg_temp.items(1)),'Invalid billed days');
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L,null,-5)',c.org,c.cust,c.d+interval '80 day',c.d+interval '81 day',pg_temp.items(1)),'Invalid amount');
  -- Doublon de ligne et entreprise étrangère
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L)',c.org,c.cust,c.d+interval '80 day',c.d+interval '81 day',pg_temp.items(1)||pg_temp.items(1)),'duplicate');
  perform pg_temp.as_user('22222222-2222-2222-2222-222222222222');
  perform pg_temp.expect_error(format('select public.create_confirmed_reservation(%L,%L,%L,%L,%L)',c.org,c.cust,c.d+interval '80 day',c.d+interval '81 day',pg_temp.items(1)),'Not authorized');
  raise notice 'OK 04_pricing';
end $$;
