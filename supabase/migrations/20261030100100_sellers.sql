-- =============================================================================
-- Migration 2: seller profiles + verification documents
-- Public access to sellers is ONLY through public.public_seller_profiles
-- (verified sellers, safe columns). The base table is owner/admin only.
-- =============================================================================

create table public.seller_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete restrict,
  business_name       text not null check (char_length(business_name) between 2 and 200),
  slug                text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  business_type       text not null check (business_type in (
                        'manufacturer', 'mine_owner', 'stone_supplier', 'exporter', 'wholesaler',
                        'retailer', 'contractor', 'architect', 'interior_designer', 'builder', 'importer')),
  owner_name          text,
  business_email      text,
  phone               text,
  whatsapp_number     text,
  gst_number          text check (gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  business_address    text,
  city                text,
  state               text,
  country             text not null default 'IN' check (country ~ '^[A-Z]{2}$'),
  pincode             text,
  website             text check (website is null or website ~* '^https?://'),
  years_in_business   integer check (years_in_business between 0 and 300),
  description         text,
  logo_url            text,
  cover_image_url     text,
  verification_status text not null default 'draft'
                      check (verification_status in ('draft', 'submitted', 'under_review', 'verified', 'rejected', 'suspended')),
  verification_reason text,           -- admin-supplied reason for rejection/suspension (owner-readable)
  verified_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint seller_profiles_user_key unique (user_id),
  constraint seller_profiles_slug_key unique (slug),
  constraint seller_profiles_gst_key unique (gst_number)
);
create index seller_profiles_status_idx on public.seller_profiles (verification_status);
create index seller_profiles_location_idx on public.seller_profiles (country, state, city);
create index seller_profiles_type_idx on public.seller_profiles (business_type);
create trigger seller_profiles_set_updated_at before update on public.seller_profiles
  for each row execute function public.set_updated_at();

create table public.seller_verification_documents (
  id                  uuid primary key default gen_random_uuid(),
  seller_id           uuid not null references public.seller_profiles (id) on delete restrict,
  document_type       text not null check (document_type in (
                        'gst_certificate', 'pan_card', 'business_registration', 'trade_license', 'address_proof', 'other')),
  storage_path        text not null,
  verification_status text not null default 'pending'
                      check (verification_status in ('pending', 'approved', 'rejected')),
  rejection_reason    text,
  uploaded_at         timestamptz not null default now(),
  reviewed_at         timestamptz,
  reviewed_by         uuid references public.profiles (id) on delete restrict,
  constraint seller_docs_path_key unique (storage_path),
  -- Files live under "<seller_id>/..." in the private bucket.
  constraint seller_docs_path_owner check (storage_path like seller_id::text || '/%')
);
create index seller_docs_seller_idx on public.seller_verification_documents (seller_id);
create index seller_docs_status_idx on public.seller_verification_documents (verification_status);

-- ------------------------------------------------------------------ helpers ---
create or replace function public.is_seller_owner(_seller_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_account_active() and exists (
    select 1 from public.seller_profiles s where s.id = _seller_id and s.user_id = auth.uid()
  );
$$;

-- Boolean only; safe for anonymous callers (used by public product policies).
create or replace function public.is_seller_verified(_seller_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.seller_profiles s
    where s.id = _seller_id and s.verification_status = 'verified'
  );
$$;

-- Guard: non-admin edits can't touch status; changing identity fields of a
-- verified seller drops them back to 'submitted' for re-review.
create or replace function public.seller_profiles_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- Restrictions apply only to direct client writes (current_user = 'authenticated').
  -- Trusted SECURITY DEFINER functions (owner) and the service role bypass them.
  if current_user <> 'authenticated' or public.is_admin() then
    return new;
  end if;
  if new.user_id <> old.user_id
     or new.verification_status <> old.verification_status
     or new.verification_reason is distinct from old.verification_reason
     or new.verified_at is distinct from old.verified_at then
    raise exception 'protected seller fields cannot be changed' using errcode = '42501';
  end if;
  if old.verification_status = 'verified'
     and (new.gst_number is distinct from old.gst_number or new.business_name <> old.business_name) then
    new.verification_status := 'submitted';
    new.verified_at := null;
  end if;
  return new;
end;
$$;
create trigger seller_profiles_guard_trg before update on public.seller_profiles
  for each row execute function public.seller_profiles_guard();

-- Seller submits their profile for review (needs complete profile + >=1 document).
create or replace function public.submit_seller_verification()
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.seller_profiles;
begin
  select * into s from public.seller_profiles where user_id = auth.uid() for update;
  if not found or not public.current_account_active() then
    raise exception 'seller profile not found' using errcode = 'P0002';
  end if;
  if s.verification_status not in ('draft', 'rejected') then
    raise exception 'profile cannot be submitted from status %', s.verification_status using errcode = '22023';
  end if;
  if s.business_email is null or s.phone is null or s.gst_number is null or s.business_address is null
     or s.city is null or s.state is null or s.pincode is null then
    raise exception 'business profile is incomplete' using errcode = '22023';
  end if;
  if not exists (select 1 from public.seller_verification_documents d where d.seller_id = s.id) then
    raise exception 'upload at least one verification document' using errcode = '22023';
  end if;
  update public.seller_profiles
     set verification_status = 'submitted', verification_reason = null
   where id = s.id;
end;
$$;

-- Admin review of a seller. Allowed transitions:
--   submitted -> under_review | verified | rejected
--   under_review -> verified | rejected
--   verified -> suspended;  suspended -> verified
create or replace function public.admin_review_seller(_seller_id uuid, _new_status text, _reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.seller_profiles;
  ok boolean;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into s from public.seller_profiles where id = _seller_id for update;
  if not found then
    raise exception 'seller not found' using errcode = 'P0002';
  end if;
  ok := (s.verification_status = 'submitted'    and _new_status in ('under_review', 'verified', 'rejected'))
     or (s.verification_status = 'under_review' and _new_status in ('verified', 'rejected'))
     or (s.verification_status = 'verified'     and _new_status = 'suspended')
     or (s.verification_status = 'suspended'    and _new_status = 'verified');
  if not ok then
    raise exception 'invalid transition % -> %', s.verification_status, _new_status using errcode = '22023';
  end if;
  if _new_status in ('rejected', 'suspended') and nullif(trim(_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  update public.seller_profiles
     set verification_status = _new_status,
         verification_reason = case when _new_status in ('rejected', 'suspended') then _reason else null end,
         verified_at = case when _new_status = 'verified' then now() else null end
   where id = _seller_id;
  perform public._write_audit_log('seller.review', 'seller_profile', _seller_id,
    jsonb_build_object('from', s.verification_status, 'to', _new_status, 'reason', _reason));
end;
$$;

create or replace function public.admin_review_document(_document_id uuid, _status text, _reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _status not in ('approved', 'rejected') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  if _status = 'rejected' and nullif(trim(_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  update public.seller_verification_documents
     set verification_status = _status,
         rejection_reason = case when _status = 'rejected' then _reason else null end,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = _document_id;
  if not found then
    raise exception 'document not found' using errcode = 'P0002';
  end if;
  perform public._write_audit_log('seller_document.review', 'seller_verification_document', _document_id,
    jsonb_build_object('status', _status, 'reason', _reason));
end;
$$;

-- Public, safe projection of verified sellers. Runs with owner rights (bypasses
-- RLS on the base table) so only the columns below can ever be read publicly.
-- GST, e-mail, phone, address and pincode are deliberately excluded.
create view public.public_seller_profiles as
  select id, business_name, slug, business_type, city, state, country, website,
         years_in_business, description, logo_url, cover_image_url, verified_at
    from public.seller_profiles
   where verification_status = 'verified';

-- --------------------------------------------------------- privileges + RLS ---
alter table public.seller_profiles enable row level security;
alter table public.seller_verification_documents enable row level security;
revoke all on table public.seller_profiles from public, anon, authenticated;
revoke all on table public.seller_verification_documents from public, anon, authenticated;
revoke all on table public.public_seller_profiles from public, anon, authenticated;

grant select on public.public_seller_profiles to anon, authenticated;
grant select on public.seller_profiles to authenticated;
grant insert (user_id, business_name, slug, business_type, owner_name, business_email, phone,
              whatsapp_number, gst_number, business_address, city, state, country, pincode,
              website, years_in_business, description, logo_url, cover_image_url)
  on public.seller_profiles to authenticated;
grant update (business_name, slug, business_type, owner_name, business_email, phone,
              whatsapp_number, gst_number, business_address, city, state, country, pincode,
              website, years_in_business, description, logo_url, cover_image_url)
  on public.seller_profiles to authenticated;

create policy seller_profiles_select_own on public.seller_profiles
  for select to authenticated using (user_id = auth.uid());
create policy seller_profiles_select_admin on public.seller_profiles
  for select to authenticated using (public.is_admin());
create policy seller_profiles_insert_own on public.seller_profiles
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_role('seller'));
create policy seller_profiles_update_own on public.seller_profiles
  for update to authenticated
  using (user_id = auth.uid() and public.current_account_active() and verification_status <> 'suspended')
  with check (user_id = auth.uid());

grant select on public.seller_verification_documents to authenticated;
grant insert (seller_id, document_type, storage_path) on public.seller_verification_documents to authenticated;
grant delete on public.seller_verification_documents to authenticated;

create policy seller_docs_select_owner on public.seller_verification_documents
  for select to authenticated using (public.is_seller_owner(seller_id));
create policy seller_docs_select_admin on public.seller_verification_documents
  for select to authenticated using (public.is_admin());
create policy seller_docs_insert_owner on public.seller_verification_documents
  for insert to authenticated with check (public.is_seller_owner(seller_id));
create policy seller_docs_delete_owner on public.seller_verification_documents
  for delete to authenticated
  using (public.is_seller_owner(seller_id) and verification_status = 'pending');

-- ---------------------------------------------------------- function privileges ---
revoke all on function public.seller_profiles_guard() from public, anon, authenticated;
revoke all on function public.is_seller_owner(uuid)   from public, anon, authenticated;
revoke all on function public.is_seller_verified(uuid) from public, anon, authenticated;
revoke all on function public.submit_seller_verification() from public, anon, authenticated;
revoke all on function public.admin_review_seller(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_review_document(uuid, text, text) from public, anon, authenticated;

grant execute on function public.is_seller_owner(uuid)    to authenticated;
grant execute on function public.is_seller_verified(uuid) to anon, authenticated;
grant execute on function public.submit_seller_verification() to authenticated;
grant execute on function public.admin_review_seller(uuid, text, text) to authenticated;
grant execute on function public.admin_review_document(uuid, text, text) to authenticated;

comment on view public.public_seller_profiles is
  'Intentionally owner-privileged projection of VERIFIED sellers with non-sensitive columns only.';
