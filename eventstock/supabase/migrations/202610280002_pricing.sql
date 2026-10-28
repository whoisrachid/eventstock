-- Étape 4 : montant des réservations (jours facturés, transport, remise, total) et lieu de l'événement.
-- À exécuter UNE fois, après 202610280001_stock_adjustment.sql.

alter table public.reservations
  add column billed_days integer not null default 1 check (billed_days between 1 and 366),
  add column subtotal bigint not null default 0 check (subtotal >= 0),
  add column transport_fee bigint not null default 0 check (transport_fee >= 0),
  add column discount bigint not null default 0 check (discount >= 0),
  add column total bigint not null default 0 check (total >= 0),
  add column event_location text not null default '' check (length(event_location) <= 200);

-- Reprise des réservations déjà existantes : jours calculés d'après les dates, sans transport ni remise.
update public.reservations r set
  billed_days = least(366, greatest(1, ceil(extract(epoch from (r.end_at - r.start_at)) / 86400)::integer));
update public.reservations r set
  subtotal = coalesce((select sum(ri.quantity * ri.unit_price) from public.reservation_items ri where ri.reservation_id = r.id), 0) * r.billed_days;
update public.reservations set total = subtotal;
alter table public.reservations
  add constraint reservations_total_consistent check (total = subtotal + transport_fee - discount);

-- Nouvelle version de la création de réservation, avec calcul du montant côté base (source de vérité).
drop function public.create_confirmed_reservation(uuid,uuid,timestamptz,timestamptz,jsonb);

create function public.create_confirmed_reservation(
  p_organization_id uuid, p_customer_id uuid, p_start_at timestamptz, p_end_at timestamptz, p_items jsonb,
  p_billed_days integer default null, p_transport_fee bigint default 0, p_discount bigint default 0,
  p_event_location text default ''
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_reservation uuid; v_equipment uuid; v_qty integer; v_stock integer; v_peak integer;
  v_item_count integer; v_days integer; v_subtotal bigint;
begin
  if auth.uid() is null or not public.has_role(p_organization_id,array['owner','manager']::public.member_role[]) then raise exception 'Not authorized'; end if;
  if p_start_at is null or p_end_at is null or p_end_at<=p_start_at then raise exception 'Invalid date range'; end if;
  if p_start_at<now()-interval '1 day' or p_end_at>now()+interval '2 years' then raise exception 'Date outside allowed range'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Invalid items'; end if;
  if p_billed_days is not null and p_billed_days not between 1 and 366 then raise exception 'Invalid billed days'; end if;
  if p_transport_fee is null or p_transport_fee<0 or p_transport_fee>100000000 then raise exception 'Invalid amount'; end if;
  if p_discount is null or p_discount<0 then raise exception 'Invalid amount'; end if;
  if length(coalesce(p_event_location,''))>200 then raise exception 'Invalid location'; end if;
  if not exists(select 1 from public.customers where id=p_customer_id and organization_id=p_organization_id) then raise exception 'Invalid customer'; end if;
  if not exists(select 1 from public.subscriptions where organization_id=p_organization_id and status='active' and expires_at>now()) then raise exception 'Subscription inactive'; end if;

  -- Lignes demandées : doublons refusés pour qu'on ne puisse pas contourner le contrôle de stock.
  create temporary table if not exists pg_temp.requested_items(equipment_id uuid primary key, quantity integer not null) on commit drop;
  truncate pg_temp.requested_items;
  begin
    insert into pg_temp.requested_items(equipment_id,quantity)
    select (x->>'equipment_id')::uuid,(x->>'quantity')::integer from jsonb_array_elements(p_items) x;
  exception when unique_violation or invalid_text_representation or numeric_value_out_of_range or not_null_violation then
    raise exception 'Invalid or duplicate equipment lines';
  end;
  select count(*) into v_item_count from pg_temp.requested_items;
  if v_item_count<>jsonb_array_length(p_items) or exists(select 1 from pg_temp.requested_items where quantity<=0 or quantity>1000000) then
    raise exception 'Invalid quantity';
  end if;

  -- Verrou de chaque équipement, toujours dans le même ordre (évite les interblocages).
  for v_equipment in select equipment_id from pg_temp.requested_items order by equipment_id loop
    perform 1 from public.equipment where id=v_equipment and organization_id=p_organization_id for update;
    if not found then raise exception 'Equipment not found in organization'; end if;
  end loop;

  -- Contrôle du pic d'utilisation simultanée sur la période [début, fin).
  for v_equipment,v_qty in select equipment_id,quantity from pg_temp.requested_items order by equipment_id loop
    select quantity_total into v_stock from public.equipment where id=v_equipment and organization_id=p_organization_id;
    v_peak := public.equipment_peak_usage(p_organization_id,v_equipment,p_start_at,p_end_at);
    if v_peak+v_qty>v_stock then
      raise exception 'Insufficient stock for equipment % (available at peak: %)',v_equipment,v_stock-v_peak;
    end if;
  end loop;

  -- Montant : jours facturés (calculés si non fournis) x prix/jour figé x quantité.
  v_days := coalesce(p_billed_days, least(366, greatest(1, ceil(extract(epoch from (p_end_at-p_start_at))/86400)::integer)));
  select sum(i.quantity*e.price_per_day)*v_days into v_subtotal
  from pg_temp.requested_items i join public.equipment e on e.id=i.equipment_id;
  if p_discount>v_subtotal+p_transport_fee then raise exception 'Discount exceeds total'; end if;

  insert into public.reservations(organization_id,customer_id,start_at,end_at,status,created_by,
    billed_days,subtotal,transport_fee,discount,total,event_location)
  values(p_organization_id,p_customer_id,p_start_at,p_end_at,'confirmed',auth.uid(),
    v_days,v_subtotal,p_transport_fee,p_discount,v_subtotal+p_transport_fee-p_discount,trim(coalesce(p_event_location,'')))
  returning id into v_reservation;

  insert into public.reservation_items(organization_id,reservation_id,equipment_id,quantity,unit_price)
  select p_organization_id,v_reservation,i.equipment_id,i.quantity,e.price_per_day
  from pg_temp.requested_items i join public.equipment e on e.id=i.equipment_id;

  insert into public.audit_logs(organization_id,actor_id,action,details)
  values(p_organization_id,auth.uid(),'reservation.confirmed',jsonb_build_object('reservation_id',v_reservation,'total',v_subtotal+p_transport_fee-p_discount));
  return v_reservation;
end;$$;
revoke all on function public.create_confirmed_reservation(uuid,uuid,timestamptz,timestamptz,jsonb,integer,bigint,bigint,text) from public, anon;
grant execute on function public.create_confirmed_reservation(uuid,uuid,timestamptz,timestamptz,jsonb,integer,bigint,bigint,text) to authenticated;
