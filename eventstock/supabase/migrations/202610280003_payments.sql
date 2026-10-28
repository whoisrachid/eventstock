-- Étape 5 : encaissements (espèces, Wave, Orange Money, MTN MoMo, virement) et reste à payer.
-- À exécuter UNE fois, après 202610280002_pricing.sql.

-- Un paiement saisi par erreur n'est jamais supprimé : il est annulé (traçabilité).
alter table public.payments
  add column voided_at timestamptz,
  add column voided_by uuid references auth.users(id);
create index payments_reservation_idx on public.payments(reservation_id) where voided_at is null;

-- Vue du reste à payer. security_invoker : la vue respecte les règles RLS de l'utilisateur connecté.
create view public.reservation_balances with (security_invoker = true) as
select r.id as reservation_id, r.organization_id, r.status, r.start_at, r.end_at, r.total,
       coalesce(sum(p.amount) filter (where p.voided_at is null), 0)::bigint as paid,
       (r.total - coalesce(sum(p.amount) filter (where p.voided_at is null), 0))::bigint as balance
from public.reservations r
left join public.payments p on p.reservation_id = r.id
group by r.id;
grant select on public.reservation_balances to authenticated;

create function public.record_payment(
  p_organization_id uuid, p_reservation_id uuid, p_amount bigint, p_method text, p_reference text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_status public.reservation_status; v_total bigint; v_paid bigint; v_id uuid;
begin
  if auth.uid() is null or not public.has_role(p_organization_id,array['owner','manager']::public.member_role[]) then
    raise exception 'Not authorized';
  end if;
  if p_amount is null or p_amount<=0 or p_amount>100000000000 then raise exception 'Invalid amount'; end if;
  if p_method is null or p_method not in ('cash','wave','orange_money','mtn_momo','bank_transfer','other') then
    raise exception 'Invalid payment method';
  end if;
  if length(coalesce(p_reference,''))>100 then raise exception 'Invalid reference'; end if;
  -- Verrou de la réservation : deux encaissements simultanés ne peuvent pas dépasser le total.
  select status,total into v_status,v_total from public.reservations
   where id=p_reservation_id and organization_id=p_organization_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_status='cancelled' then raise exception 'Reservation cancelled'; end if;
  select coalesce(sum(amount),0) into v_paid from public.payments
   where reservation_id=p_reservation_id and organization_id=p_organization_id and voided_at is null;
  if p_amount>v_total-v_paid then raise exception 'Payment exceeds balance (balance: %)', v_total-v_paid; end if;
  insert into public.payments(organization_id,reservation_id,amount,method,reference,recorded_by)
  values(p_organization_id,p_reservation_id,p_amount,p_method,nullif(trim(coalesce(p_reference,'')),''),auth.uid())
  returning id into v_id;
  insert into public.audit_logs(organization_id,actor_id,action,details)
  values(p_organization_id,auth.uid(),'payment.recorded',jsonb_build_object('payment_id',v_id,'reservation_id',p_reservation_id,'amount',p_amount,'method',p_method));
  return v_id;
end;$$;
revoke all on function public.record_payment(uuid,uuid,bigint,text,text) from public, anon;
grant execute on function public.record_payment(uuid,uuid,bigint,text,text) to authenticated;

-- Annulation d'un paiement saisi par erreur : réservé au propriétaire.
create function public.void_payment(p_organization_id uuid, p_payment_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_reservation uuid; v_amount bigint; v_voided timestamptz;
begin
  if auth.uid() is null or not public.has_role(p_organization_id,array['owner']::public.member_role[]) then
    raise exception 'Not authorized';
  end if;
  select reservation_id into v_reservation from public.payments
   where id=p_payment_id and organization_id=p_organization_id;
  if not found then raise exception 'Payment not found'; end if;
  -- Même ordre de verrouillage que record_payment : réservation, puis paiement.
  perform 1 from public.reservations where id=v_reservation and organization_id=p_organization_id for update;
  select amount,voided_at into v_amount,v_voided from public.payments
   where id=p_payment_id and organization_id=p_organization_id for update;
  if v_voided is not null then raise exception 'Payment already voided'; end if;
  update public.payments set voided_at=now(), voided_by=auth.uid() where id=p_payment_id;
  insert into public.audit_logs(organization_id,actor_id,action,details)
  values(p_organization_id,auth.uid(),'payment.voided',jsonb_build_object('payment_id',p_payment_id,'reservation_id',v_reservation,'amount',v_amount));
end;$$;
revoke all on function public.void_payment(uuid,uuid) from public, anon;
grant execute on function public.void_payment(uuid,uuid) to authenticated;
