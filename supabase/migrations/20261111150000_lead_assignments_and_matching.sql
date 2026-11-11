-- =============================================================================
-- Migration: 20261111150000_lead_assignments_and_matching.sql
-- Description: Creates the durable lead_assignments table for IndiaMART-style
--              multi-attribute RFQ matching, lead distribution tracking,
--              outbox retry handling, and updates enquiry RLS access controls.
-- =============================================================================

-- 1. Create lead_assignments table
create table if not exists public.lead_assignments (
  id                  uuid primary key default gen_random_uuid(),
  enquiry_id          uuid not null references public.enquiries(id) on delete cascade,
  seller_id           uuid not null references public.seller_profiles(id) on delete cascade,
  match_score         integer not null check (match_score >= 0 and match_score <= 100),
  match_reasons       jsonb not null default '[]'::jsonb,
  status              text not null default 'assigned'
                      check (status in ('assigned', 'viewed', 'quoted', 'declined', 'expired')),
  notification_status text not null default 'pending'
                      check (notification_status in ('pending', 'processing', 'delivered', 'failed', 'abandoned')),
  notification_error  text,
  retry_count         integer not null default 0,
  assigned_at         timestamptz not null default now(),
  viewed_at           timestamptz,
  quoted_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint lead_assignments_enquiry_seller_unique unique (enquiry_id, seller_id)
);

-- Index for fast seller inbox querying
create index if not exists lead_assignments_seller_id_idx
  on public.lead_assignments (seller_id, status, created_at desc);

create index if not exists lead_assignments_enquiry_id_idx
  on public.lead_assignments (enquiry_id);

create index if not exists lead_assignments_retry_idx
  on public.lead_assignments (notification_status, retry_count)
  where notification_status in ('pending', 'failed');

-- 2. Update can_access_enquiry() security definer to grant access to matched sellers
create or replace function public.can_access_enquiry(_enquiry_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enquiries e
    where e.id = _enquiry_id
      and (
        (e.buyer_id is not null and e.buyer_id = auth.uid())
        or (e.seller_id is not null and public.is_seller_owner(e.seller_id))
        or exists (
          select 1 from public.lead_assignments la
          where la.enquiry_id = e.id
            and public.is_seller_owner(la.seller_id)
        )
        or public.is_admin()
      )
  );
$$;

-- 3. RLS Policies on lead_assignments
alter table public.lead_assignments enable row level security;

-- Sellers can only view their own lead assignments
create policy "lead_assignments_select_seller"
  on public.lead_assignments
  for select to authenticated
  using (public.is_seller_owner(seller_id));

-- Sellers can update their own status (e.g. mark viewed or declined)
create policy "lead_assignments_update_seller"
  on public.lead_assignments
  for update to authenticated
  using (public.is_seller_owner(seller_id))
  with check (public.is_seller_owner(seller_id));

-- Buyers can view matching rosters on their own RFQs
create policy "lead_assignments_select_buyer"
  on public.lead_assignments
  for select to authenticated
  using (
    exists (
      select 1 from public.enquiries e
      where e.id = lead_assignments.enquiry_id
        and e.buyer_id = auth.uid()
    )
  );

-- Admins can view and manage all lead assignments
create policy "lead_assignments_all_admin"
  on public.lead_assignments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, update on public.lead_assignments to authenticated;
grant all on public.lead_assignments to service_role;

