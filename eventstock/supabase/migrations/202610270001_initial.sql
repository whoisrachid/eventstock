create extension if not exists pgcrypto;
create type public.member_role as enum ('owner','manager','staff');
create type public.reservation_status as enum ('confirmed','cancelled','out','completed');
create table public.organizations(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 2 and 150),phone text,created_at timestamptz not null default now());
create table public.memberships(organization_id uuid not null references public.organizations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,role public.member_role not null default 'staff',primary key(organization_id,user_id));
create table public.equipment(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,name text not null check(length(trim(name)) between 2 and 120),quantity_total integer not null check(quantity_total>=0),price_per_day bigint not null check(price_per_day>=0),created_at timestamptz not null default now(),unique(organization_id,id));
create table public.customers(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,name text not null,phone text not null default '',created_at timestamptz not null default now(),unique(organization_id,id));
create table public.reservations(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,customer_id uuid not null,start_at timestamptz not null,end_at timestamptz not null,status public.reservation_status not null default 'confirmed',created_by uuid references auth.users(id),created_at timestamptz not null default now(),check(end_at>start_at),unique(organization_id,id),foreign key(organization_id,customer_id) references public.customers(organization_id,id));
create table public.reservation_items(id uuid primary key default gen_random_uuid(),organization_id uuid not null,reservation_id uuid not null,equipment_id uuid not null,quantity integer not null check(quantity>0),unit_price bigint not null check(unit_price>=0),foreign key(organization_id,reservation_id) references public.reservations(organization_id,id) on delete cascade,foreign key(organization_id,equipment_id) references public.equipment(organization_id,id));
create index reservations_dates_idx on public.reservations(organization_id,start_at,end_at) where status in ('confirmed','out');
create index reservation_items_equipment_idx on public.reservation_items(equipment_id,reservation_id);
create table public.payments(id uuid primary key default gen_random_uuid(),organization_id uuid not null,reservation_id uuid not null,amount bigint not null check(amount>0),method text not null check(method in ('cash','wave','orange_money','mtn_momo','bank_transfer','other')),reference text,recorded_by uuid not null references auth.users(id),created_at timestamptz not null default now(),foreign key(organization_id,reservation_id) references public.reservations(organization_id,id));
create table public.subscriptions(organization_id uuid primary key references public.organizations(id) on delete cascade,plan text not null default 'trial' check(plan in ('trial','starter','pro')),status text not null default 'active' check(status in ('active','expired','suspended')),expires_at timestamptz not null default(now()+interval '14 days'));
create table public.audit_logs(id bigint generated always as identity primary key,organization_id uuid not null references public.organizations(id),actor_id uuid references auth.users(id),action text not null,details jsonb not null default '{}',created_at timestamptz not null default now());

create function public.is_member(p_org uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.memberships where organization_id=p_org and user_id=(select auth.uid()))$$;
create function public.has_role(p_org uuid,p_roles public.member_role[]) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.memberships where organization_id=p_org and user_id=(select auth.uid()) and role=any(p_roles))$$;
revoke all on function public.is_member(uuid),public.has_role(uuid,public.member_role[]) from public;
grant execute on function public.is_member(uuid),public.has_role(uuid,public.member_role[]) to authenticated;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.equipment enable row level security;
alter table public.customers enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;
create policy org_read on public.organizations for select to authenticated using(public.is_member(id));
create policy member_read on public.memberships for select to authenticated using(public.is_member(organization_id));
create policy equipment_read on public.equipment for select to authenticated using(public.is_member(organization_id));
create policy equipment_insert on public.equipment for insert to authenticated with check(public.has_role(organization_id,array['owner','manager']::public.member_role[]));
-- Stock updates are restricted to the database admin until stock-adjustment RPC with concurrency safeguards is added.
create policy customers_read on public.customers for select to authenticated using(public.is_member(organization_id));
create policy customers_insert on public.customers for insert to authenticated with check(public.is_member(organization_id));
create policy customers_update on public.customers for update to authenticated using(public.is_member(organization_id)) with check(public.is_member(organization_id));
create policy reservations_read on public.reservations for select to authenticated using(public.is_member(organization_id));
create policy reservation_items_read on public.reservation_items for select to authenticated using(public.is_member(organization_id));
create policy payments_read on public.payments for select to authenticated using(public.is_member(organization_id));
create policy subscription_read on public.subscriptions for select to authenticated using(public.is_member(organization_id));
create policy audit_read on public.audit_logs for select to authenticated using(public.has_role(organization_id,array['owner']::public.member_role[]));

create function public.create_organization(p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Not authenticated';end if;
 if length(trim(p_name)) not between 2 and 150 then raise exception 'Invalid organization name';end if;
 insert into public.organizations(name) values(trim(p_name)) returning id into v_id;
 insert into public.memberships(organization_id,user_id,role) values(v_id,auth.uid(),'owner');
 insert into public.subscriptions(organization_id) values(v_id);
 return v_id;
end;$$;
revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;

-- IMPORTANT: all reservations are inserted through this RPC; direct writes to reservations/items are denied by RLS.
-- Equipment row locks serialize concurrent confirmations for overlapping items.
create function public.create_confirmed_reservation(
 p_organization_id uuid,p_customer_id uuid,p_start_at timestamptz,p_end_at timestamptz,p_items jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_reservation uuid;v_equipment uuid;v_qty integer;v_stock integer;v_price bigint;v_max integer;v_id uuid;v_item_count integer;
begin
 if auth.uid() is null or not public.has_role(p_organization_id,array['owner','manager']::public.member_role[]) then raise exception 'Not authorized';end if;
 if p_start_at is null or p_end_at is null or p_end_at<=p_start_at then raise exception 'Invalid date range';end if;
 if p_start_at<now()-interval '1 day' or p_end_at>now()+interval '2 years' then raise exception 'Date outside allowed range';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Invalid items';end if;
 if not exists(select 1 from public.customers where id=p_customer_id and organization_id=p_organization_id) then raise exception 'Invalid customer';end if;
 if not exists(select 1 from public.subscriptions where organization_id=p_organization_id and status='active' and expires_at>now()) then raise exception 'Subscription inactive';end if;
 -- Validate and normalize JSON. Duplicates are rejected, preventing duplicate lines from bypassing capacity checks.
 create temporary table if not exists pg_temp.requested_items(equipment_id uuid primary key,quantity integer not null) on commit drop;
 truncate pg_temp.requested_items;
 begin
  insert into pg_temp.requested_items(equipment_id,quantity)
  select (x->>'equipment_id')::uuid,(x->>'quantity')::integer from jsonb_array_elements(p_items) x;
 exception when unique_violation or invalid_text_representation or numeric_value_out_of_range or not_null_violation then
  raise exception 'Invalid or duplicate equipment lines';
 end;
 select count(*) into v_item_count from pg_temp.requested_items;
 if v_item_count<>jsonb_array_length(p_items) or exists(select 1 from pg_temp.requested_items where quantity<=0) then raise exception 'Invalid quantity';end if;
 -- Lock each equipment row in deterministic order; no other transaction can confirm it concurrently.
 for v_equipment in select equipment_id from pg_temp.requested_items order by equipment_id loop
  perform 1 from public.equipment where id=v_equipment and organization_id=p_organization_id for update;
  if not found then raise exception 'Equipment not found in organization';end if;
 end loop;
 -- For every relevant boundary, calculate simultaneously reserved quantities. Half-open [start,end).
 for v_equipment,v_qty in select equipment_id,quantity from pg_temp.requested_items order by equipment_id loop
  select quantity_total,price_per_day into v_stock,v_price from public.equipment where id=v_equipment and organization_id=p_organization_id;
  select coalesce(max(used),0) into v_max from (
   select coalesce(sum(ri.quantity) filter(where r.start_at<=t.point and r.end_at>t.point),0)::integer as used
   from (
    select p_start_at as point
    union
    select greatest(r.start_at,p_start_at) as point
    from public.reservations r join public.reservation_items ri on ri.reservation_id=r.id
    where ri.equipment_id=v_equipment and r.organization_id=p_organization_id
      and r.status in ('confirmed','out') and r.start_at<p_end_at and r.end_at>p_start_at
   ) t
   left join public.reservations r on r.organization_id=p_organization_id and r.status in ('confirmed','out') and r.start_at<=t.point and r.end_at>t.point
   left join public.reservation_items ri on ri.reservation_id=r.id and ri.equipment_id=v_equipment
   group by t.point
  ) boundaries;
  if v_max+v_qty>v_stock then raise exception 'Insufficient stock for equipment % (available at peak: %)',v_equipment,v_stock-v_max;end if;
 end loop;
 insert into public.reservations(organization_id,customer_id,start_at,end_at,status,created_by)
 values(p_organization_id,p_customer_id,p_start_at,p_end_at,'confirmed',auth.uid()) returning id into v_reservation;
 insert into public.reservation_items(organization_id,reservation_id,equipment_id,quantity,unit_price)
 select p_organization_id,v_reservation,i.equipment_id,i.quantity,e.price_per_day
 from pg_temp.requested_items i join public.equipment e on e.id=i.equipment_id;
 insert into public.audit_logs(organization_id,actor_id,action,details) values(p_organization_id,auth.uid(),'reservation.confirmed',jsonb_build_object('reservation_id',v_reservation));
 return v_reservation;
end;$$;
revoke all on function public.create_confirmed_reservation(uuid,uuid,timestamptz,timestamptz,jsonb) from public;
grant execute on function public.create_confirmed_reservation(uuid,uuid,timestamptz,timestamptz,jsonb) to authenticated;

create function public.cancel_reservation(p_organization_id uuid,p_reservation_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_equipment uuid;v_status public.reservation_status;
begin
 if not public.has_role(p_organization_id,array['owner','manager']::public.member_role[]) then raise exception 'Not authorized';end if;
 -- Lock all equipment in deterministic order, same protocol as confirmation.
 for v_equipment in select distinct ri.equipment_id from public.reservation_items ri where ri.reservation_id=p_reservation_id and ri.organization_id=p_organization_id order by ri.equipment_id loop
  perform 1 from public.equipment where id=v_equipment and organization_id=p_organization_id for update;
 end loop;
 select status into v_status from public.reservations where id=p_reservation_id and organization_id=p_organization_id for update;
 if not found then raise exception 'Reservation not found';end if;
 if v_status<>'confirmed' then raise exception 'Only confirmed reservations can be cancelled';end if;
 update public.reservations set status='cancelled' where id=p_reservation_id and organization_id=p_organization_id;
 insert into public.audit_logs(organization_id,actor_id,action,details) values(p_organization_id,auth.uid(),'reservation.cancelled',jsonb_build_object('reservation_id',p_reservation_id));
end;$$;
revoke all on function public.cancel_reservation(uuid,uuid) from public;
grant execute on function public.cancel_reservation(uuid,uuid) to authenticated;
