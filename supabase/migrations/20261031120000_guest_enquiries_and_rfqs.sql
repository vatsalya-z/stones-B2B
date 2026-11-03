-- ============================================================================
-- Migration: 20261031120000_guest_enquiries_and_rfqs.sql
-- Domain: Commerce / Enquiries & RFQ Persistence
-- Purpose:
--   1. Support guest sourcing enquiries and guest RFQs persistently in public.enquiries.
--   2. Drop NOT NULL on buyer_id and seller_id (safe additive change).
--   3. Add guest identity columns: guest_name, guest_email, guest_phone, guest_company.
--   4. Add enquiry_type ('direct' | 'rfq') and specifications JSONB column.
--   5. Add identity integrity constraint: buyer_id IS NOT NULL OR (guest_name IS NOT NULL AND (guest_email IS NOT NULL OR guest_phone IS NOT NULL)).
--   6. Add partial unique index for guest client_request_id idempotency.
--   7. Update can_access_enquiry() and notify_on_enquiry_created() for nullable buyer/seller.
--   8. Add additive capabilities and monthly_capacity to seller_profiles if not exists.
-- ============================================================================

-- 1. Safe Additive Columns on public.enquiries
alter table public.enquiries alter column buyer_id drop not null;
alter table public.enquiries alter column seller_id drop not null;

alter table public.enquiries add column if not exists guest_name text;
alter table public.enquiries add column if not exists guest_email text;
alter table public.enquiries add column if not exists guest_phone text;
alter table public.enquiries add column if not exists guest_company text;
alter table public.enquiries add column if not exists enquiry_type text not null default 'direct';
alter table public.enquiries add column if not exists specifications jsonb not null default '{}'::jsonb;

-- 2. Identity Check Constraint: Every enquiry must identify the requester (either auth buyer or guest)
-- Enforces whitespace rejection via nullif(trim(...), '') so spaces-only inputs cannot satisfy guest identity
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'enquiries_requester_identity_check' and conrelid = 'public.enquiries'::regclass
  ) then
    alter table public.enquiries drop constraint enquiries_requester_identity_check;
  end if;

  alter table public.enquiries add constraint enquiries_requester_identity_check
    check (
      buyer_id is not null
      or (
        nullif(trim(guest_name), '') is not null
        and (
          nullif(trim(guest_email), '') is not null
          or nullif(trim(guest_phone), '') is not null
        )
      )
    );
end $$;

-- 3. Partial Unique Index for Guest Idempotency
create unique index if not exists enquiries_guest_idempotency_idx
  on public.enquiries (client_request_id)
  where buyer_id is null and client_request_id is not null;

-- 4. Update can_access_enquiry() security definer to safely handle nullable buyer_id and seller_id
create or replace function public.can_access_enquiry(_enquiry_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enquiries e
    where e.id = _enquiry_id
      and (
        (e.buyer_id is not null and e.buyer_id = auth.uid())
        or (e.seller_id is not null and public.is_seller_owner(e.seller_id))
        or public.is_admin()
      )
  );
$$;

-- 5. Update notify_on_enquiry_created() trigger function to format guest names cleanly
create or replace function public.notify_on_enquiry_created()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_seller_user_id uuid;
  v_seller_name    text;
  v_buyer_name     text;
  v_qty_text       text;
begin
  if new.seller_id is not null then
    select s.user_id, s.business_name into v_seller_user_id, v_seller_name
    from public.seller_profiles s
    where s.id = new.seller_id;
  end if;

  if new.buyer_id is not null then
    select coalesce(nullif(trim(p.full_name), ''), 'A buyer') into v_buyer_name
    from public.profiles p
    where p.id = new.buyer_id;
  else
    v_buyer_name := coalesce(nullif(trim(new.guest_name), ''), 'A prospective buyer');
  end if;

  v_qty_text := trim(to_char(new.quantity, 'FM999999999990.###')) || ' ' || replace(new.unit, '_', ' ');

  if v_seller_user_id is not null then
    perform public._emit_notification(
      v_seller_user_id,
      'New Enquiry: ' || left(new.enquiry_title, 160),
      v_buyer_name || ' requested ' || v_qty_text || '.',
      'enquiry_received',
      new.id,
      5
    );
  end if;

  if new.buyer_id is not null then
    perform public._emit_notification(
      new.buyer_id,
      'Enquiry Sent: ' || left(new.enquiry_title, 160),
      'Your requirement for ' || v_qty_text || ' has been submitted to ' || coalesce(v_seller_name, 'the supplier') || '.',
      'system',
      new.id,
      5
    );
  end if;

  return new;
end;
$$;

-- 6. Additive Columns on public.seller_profiles
alter table public.seller_profiles add column if not exists capabilities text[] default '{}';
alter table public.seller_profiles add column if not exists monthly_capacity text;

-- 7. Minimum Necessary Column Grants for Authenticated Buyers
-- Preserves least-privilege: clients only have SELECT and specific column INSERT.
-- UPDATE and DELETE remain strictly revoked for clients (all mutations go via SECURITY DEFINER transition_enquiry_status).
-- Anon role retains NO privileges on public.enquiries.
grant insert (enquiry_type, specifications)
  on public.enquiries to authenticated;

