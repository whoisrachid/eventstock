-- Étape 3 : modification sécurisée du matériel (nom, prix, quantité en stock).
-- À exécuter UNE fois, après 202610270001_initial.sql.

-- Durcissement : sur Supabase, les visiteurs non connectés (anon) reçoivent par défaut le droit
-- d'exécuter les fonctions. Elles refusaient déjà ces appels ; on retire quand même ce droit.
revoke execute on function public.is_member(uuid), public.has_role(uuid,public.member_role[]),
  public.create_organization(text), public.cancel_reservation(uuid,uuid) from anon;

-- Pic d'utilisation simultanée d'un équipement sur [p_from, p_to).
-- Fonction interne : non accessible depuis le navigateur.
create function public.equipment_peak_usage(
  p_organization_id uuid, p_equipment_id uuid, p_from timestamptz, p_to timestamptz
) returns integer language sql stable security definer set search_path='' as $$
  select coalesce(max(used),0)::integer from (
    select (
      select coalesce(sum(ri.quantity),0)
      from public.reservation_items ri
      join public.reservations r on r.id=ri.reservation_id
      where ri.equipment_id=p_equipment_id and r.organization_id=p_organization_id
        and r.status in ('confirmed','out') and r.start_at<=pt.point and r.end_at>pt.point
    ) as used
    from (
      select p_from as point
      union
      select r.start_at
      from public.reservations r join public.reservation_items ri on ri.reservation_id=r.id
      where ri.equipment_id=p_equipment_id and r.organization_id=p_organization_id
        and r.status in ('confirmed','out') and r.start_at>p_from and r.start_at<p_to
    ) pt
  ) s
$$;
revoke all on function public.equipment_peak_usage(uuid,uuid,timestamptz,timestamptz) from public, anon, authenticated;

create function public.update_equipment(
  p_organization_id uuid, p_equipment_id uuid, p_name text, p_quantity_total integer, p_price_per_day bigint
) returns void language plpgsql security definer set search_path='' as $$
declare v_old public.equipment; v_peak integer;
begin
  if auth.uid() is null or not public.has_role(p_organization_id,array['owner','manager']::public.member_role[]) then
    raise exception 'Not authorized';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 120 then raise exception 'Invalid name'; end if;
  if p_quantity_total is null or p_quantity_total<0 or p_quantity_total>1000000 then raise exception 'Invalid quantity'; end if;
  if p_price_per_day is null or p_price_per_day<0 or p_price_per_day>100000000 then raise exception 'Invalid amount'; end if;
  -- Même verrou que la création de réservation : aucune confirmation concurrente pendant la vérification.
  select * into v_old from public.equipment
   where id=p_equipment_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Equipment not found in organization'; end if;
  -- On ne peut pas descendre sous ce qui est déjà promis aux clients (réservations en cours ou à venir).
  v_peak := public.equipment_peak_usage(p_organization_id,p_equipment_id,now(),'infinity');
  if p_quantity_total<v_peak then
    raise exception 'Stock below commitments (peak: %)', v_peak;
  end if;
  -- Le prix des réservations déjà confirmées ne change pas (prix figé sur chaque ligne).
  update public.equipment
     set name=trim(p_name), quantity_total=p_quantity_total, price_per_day=p_price_per_day
   where id=p_equipment_id and organization_id=p_organization_id;
  insert into public.audit_logs(organization_id,actor_id,action,details)
  values(p_organization_id,auth.uid(),'equipment.updated',jsonb_build_object(
    'equipment_id',p_equipment_id,
    'old',jsonb_build_object('name',v_old.name,'quantity_total',v_old.quantity_total,'price_per_day',v_old.price_per_day),
    'new',jsonb_build_object('name',trim(p_name),'quantity_total',p_quantity_total,'price_per_day',p_price_per_day)));
end;$$;
revoke all on function public.update_equipment(uuid,uuid,text,integer,bigint) from public, anon;
grant execute on function public.update_equipment(uuid,uuid,text,integer,bigint) to authenticated;
