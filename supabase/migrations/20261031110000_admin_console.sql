-- =============================================================================
-- Migration 8: Admin Console support
--
-- Purely additive and backward compatible. No historical migration is modified.
--
--   * platform_settings            key/value JSON settings (marketplace, contact,
--                                  homepage/banner, SEO). Public read ONLY for
--                                  rows flagged is_public; NO client write grants;
--                                  writes only through admin_set_platform_setting()
--                                  (super_admin only, audited with before/after).
--   * admin_restore_product()      archived -> pending_review (never straight to
--                                  approved). Audited.
--   * admin_request_seller_documents()
--                                  asks a seller for more documents without a
--                                  status change beyond submitted -> under_review.
--   * admin_dashboard_metrics()    one-round-trip counters.
--   * admin_time_series()          zero-filled daily buckets, Asia/Kolkata days.
--   * admin_distribution()         status / category / role distributions.
--   * admin_moderation_series()    approve/reject counts from the audit log.
--   * admin_category_performance() products + enquiries per category.
--   * categories_delete_guard      only a super_admin may delete a category
--                                  (FK RESTRICT remains the final backstop).
--
-- Rollback (documented, not auto-run):
--   drop trigger categories_delete_guard_trg on public.categories;
--   drop function public.categories_delete_guard();
--   drop function public.admin_category_performance(), public.admin_moderation_series(text, integer),
--                 public.admin_distribution(text), public.admin_time_series(text, integer),
--                 public.admin_dashboard_metrics(), public.admin_request_seller_documents(uuid, text),
--                 public.admin_restore_product(uuid, text),
--                 public.admin_set_platform_setting(text, jsonb, boolean),
--                 public.is_rfq_enquiry(uuid, text);
--   drop table public.platform_settings;
--   (indexes below can be dropped independently; audit rows already written are retained.)
-- =============================================================================

-- ------------------------------------------------------------ RFQ predicate ---
-- An RFQ is an enquiry with no product OR whose description carries the RFQ
-- specification header written by the buyer portal (encodeRfqDescription).
create or replace function public.is_rfq_enquiry(_product_id uuid, _description text)
returns boolean language sql immutable set search_path = '' as $$
  select _product_id is null
      or position('--- RFQ Technical & Delivery Specifications ---' in coalesce(_description, '')) > 0;
$$;

-- ------------------------------------------------------- supporting indexes ---
create index if not exists profiles_created_at_idx          on public.profiles (created_at);
create index if not exists seller_profiles_created_at_idx   on public.seller_profiles (created_at);
create index if not exists products_created_at_idx          on public.products (created_at);
create index if not exists products_moderation_updated_idx  on public.products (moderation_status, updated_at);
create index if not exists enquiries_created_at_idx         on public.enquiries (created_at);
create index if not exists quotations_created_at_idx        on public.quotations (created_at);
create index if not exists admin_audit_logs_action_idx      on public.admin_audit_logs (action, created_at desc);

-- ------------------------------------------------------------ platform_settings ---
create table if not exists public.platform_settings (
  key        text primary key check (key in ('marketplace', 'contact', 'homepage', 'seo')),
  value      jsonb not null default '{}'::jsonb
             check (jsonb_typeof(value) = 'object' and octet_length(value::text) <= 16384),
  is_public  boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;
create trigger platform_settings_set_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

insert into public.platform_settings (key, value, is_public) values
  ('marketplace',
   '{"name":"StoneB2B","tagline":"India''s B2B natural stone marketplace","default_currency":"INR","support_hours":"Mon-Sat, 9:30-18:30 IST"}'::jsonb,
   true),
  ('contact',
   '{"email":"","phone":"","whatsapp":"","address":""}'::jsonb,
   true),
  ('homepage',
   '{"hero_headline":"","hero_subheadline":"","banner_enabled":false,"banner_text":"","banner_link":""}'::jsonb,
   true),
  ('seo',
   '{"default_title":"","default_description":"","default_og_image":""}'::jsonb,
   true)
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;
revoke all on table public.platform_settings from public, anon, authenticated;
grant select on public.platform_settings to anon, authenticated;

drop policy if exists platform_settings_select_public on public.platform_settings;
create policy platform_settings_select_public on public.platform_settings
  for select to anon, authenticated using (is_public);

drop policy if exists platform_settings_select_admin on public.platform_settings;
create policy platform_settings_select_admin on public.platform_settings
  for select to authenticated using (public.is_admin());
-- No INSERT / UPDATE / DELETE grants or policies: writes go through the RPC below.

create or replace function public.admin_set_platform_setting(
  _key text, _value jsonb, _is_public boolean default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  old_row public.platform_settings;
begin
  if not public.is_super_admin() then
    raise exception 'only a super_admin can change platform settings' using errcode = '42501';
  end if;
  if _key is null or _key not in ('marketplace', 'contact', 'homepage', 'seo') then
    raise exception 'unknown setting key' using errcode = '22023';
  end if;
  if _value is null or jsonb_typeof(_value) <> 'object' then
    raise exception 'setting value must be a JSON object' using errcode = '22023';
  end if;
  if octet_length(_value::text) > 16384 then
    raise exception 'setting value is too large' using errcode = '22023';
  end if;

  select * into old_row from public.platform_settings where key = _key for update;

  insert into public.platform_settings (key, value, is_public, updated_by)
  values (_key, _value, coalesce(_is_public, false), auth.uid())
  on conflict (key) do update
    set value      = excluded.value,
        is_public  = coalesce(_is_public, public.platform_settings.is_public),
        updated_by = auth.uid();

  perform public._write_audit_log('settings.update', 'platform_setting', null,
    jsonb_build_object('key', _key, 'before', old_row.value, 'after', _value,
                       'is_public', coalesce(_is_public, old_row.is_public)));
end;
$$;

-- ------------------------------------------------------- product restore RPC ---
create or replace function public.admin_restore_product(_product_id uuid, _reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.products;
  v_seller_user uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into p from public.products where id = _product_id for update;
  if not found then
    raise exception 'product not found' using errcode = 'P0002';
  end if;
  if p.moderation_status <> 'archived' then
    raise exception 'only archived products can be restored' using errcode = '22023';
  end if;
  if nullif(trim(_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  -- Restored products always re-enter the review queue; they are never auto-approved.
  update public.products
     set moderation_status = 'pending_review', rejection_reason = null
   where id = _product_id;

  perform public._write_audit_log('product.restore', 'product', _product_id,
    jsonb_build_object('from', 'archived', 'to', 'pending_review', 'reason', _reason));

  select s.user_id into v_seller_user from public.seller_profiles s where s.id = p.seller_id;
  perform public._emit_notification(
    v_seller_user,
    'Product Restored For Review: ' || left(p.name, 140),
    'An administrator restored "' || left(p.name, 140) || '" and returned it to the review queue.',
    'product_moderation',
    p.id,
    5
  );
end;
$$;

-- ------------------------------------------------ seller document request RPC ---
create or replace function public.admin_request_seller_documents(_seller_id uuid, _message text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.seller_profiles;
  v_msg text := left(trim(coalesce(_message, '')), 1000);
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if v_msg = '' then
    raise exception 'a message is required' using errcode = '22023';
  end if;
  select * into s from public.seller_profiles where id = _seller_id for update;
  if not found then
    raise exception 'seller not found' using errcode = 'P0002';
  end if;
  if s.verification_status not in ('submitted', 'under_review') then
    raise exception 'documents can only be requested while a verification is in review (status %)',
      s.verification_status using errcode = '22023';
  end if;

  update public.seller_profiles
     set verification_status = 'under_review',
         verification_reason = v_msg
   where id = _seller_id;

  perform public._write_audit_log('seller.request_documents', 'seller_profile', _seller_id,
    jsonb_build_object('from', s.verification_status, 'to', 'under_review', 'message', v_msg));

  perform public._emit_notification(
    s.user_id,
    'Additional Verification Documents Requested',
    v_msg,
    'seller_verification',
    s.id,
    5
  );
end;
$$;

-- ------------------------------------------------------------ dashboard metrics ---
create or replace function public.admin_dashboard_metrics()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_result jsonb;
  v_since_7d timestamptz := now() - interval '7 days';
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users',               (select count(*) from public.profiles),
    'users_7d',            (select count(*) from public.profiles where created_at >= v_since_7d),
    'suspended_accounts',  (select count(*) from public.profiles where account_status = 'suspended'),
    'buyers',              (select count(distinct user_id) from public.user_roles where role = 'buyer'),
    'seller_accounts',     (select count(distinct user_id) from public.user_roles where role = 'seller'),
    'admins',              (select count(distinct user_id) from public.user_roles where role in ('admin', 'super_admin')),
    'sellers',             s.total,
    'sellers_draft',       s.draft,
    'sellers_verified',    s.verified,
    'sellers_pending',     s.pending,
    'sellers_rejected',    s.rejected,
    'sellers_suspended',   s.suspended,
    'sellers_7d',          s.new_7d,
    'products',            p.total,
    'products_draft',      p.draft,
    'products_pending',    p.pending,
    'products_approved',   p.approved,
    'products_rejected',   p.rejected,
    'products_archived',   p.archived,
    'products_7d',         p.new_7d,
    'enquiries',           e.total,
    'rfqs',                e.rfqs,
    'enquiries_7d',        e.new_7d,
    'quotations',          q.total,
    'quotations_sent',     q.sent,
    'quotations_accepted', q.accepted,
    'quotations_rejected', q.rejected,
    'categories',          (select count(*) from public.categories),
    'generated_at',        now()
  ) into v_result
  from
    (select count(*) total,
            count(*) filter (where verification_status = 'draft') draft,
            count(*) filter (where verification_status = 'verified') verified,
            count(*) filter (where verification_status in ('submitted', 'under_review')) pending,
            count(*) filter (where verification_status = 'rejected') rejected,
            count(*) filter (where verification_status = 'suspended') suspended,
            count(*) filter (where created_at >= v_since_7d) new_7d
       from public.seller_profiles) s,
    (select count(*) total,
            count(*) filter (where moderation_status = 'draft') draft,
            count(*) filter (where moderation_status = 'pending_review') pending,
            count(*) filter (where moderation_status = 'approved') approved,
            count(*) filter (where moderation_status = 'rejected') rejected,
            count(*) filter (where moderation_status = 'archived') archived,
            count(*) filter (where created_at >= v_since_7d) new_7d
       from public.products) p,
    (select count(*) total,
            count(*) filter (where public.is_rfq_enquiry(product_id, description)) rfqs,
            count(*) filter (where created_at >= v_since_7d) new_7d
       from public.enquiries) e,
    (select count(*) total,
            count(*) filter (where status = 'sent') sent,
            count(*) filter (where status = 'accepted') accepted,
            count(*) filter (where status = 'rejected') rejected
       from public.quotations) q;

  return v_result;
end;
$$;

-- --------------------------------------------------------------- time series ---
-- Daily buckets in Asia/Kolkata (the marketplace's operating timezone), zero-filled,
-- inclusive of "today". _days is clamped to 1..366.
create or replace function public.admin_time_series(_metric text, _days integer default 30)
returns table (bucket_date date, bucket_total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_days  integer := least(greatest(coalesce(_days, 30), 1), 366);
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_start date;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _metric is null or _metric not in ('users', 'buyers', 'sellers', 'products', 'enquiries', 'rfqs', 'quotations') then
    raise exception 'unknown metric' using errcode = '22023';
  end if;
  v_start := v_today - (v_days - 1);

  return query
  with src as (
    select created_at as ts from public.profiles where _metric = 'users'
    union all
    select created_at from public.user_roles where _metric = 'buyers' and role = 'buyer'
    union all
    select created_at from public.seller_profiles where _metric = 'sellers'
    union all
    select created_at from public.products where _metric = 'products'
    union all
    select created_at from public.enquiries where _metric = 'enquiries'
    union all
    select created_at from public.enquiries
     where _metric = 'rfqs' and public.is_rfq_enquiry(product_id, description)
    union all
    select created_at from public.quotations where _metric = 'quotations'
  ),
  agg as (
    select (ts at time zone 'Asia/Kolkata')::date as d, count(*) as c
      from src
     where (ts at time zone 'Asia/Kolkata')::date >= v_start
     group by 1
  )
  select gs::date, coalesce(agg.c, 0)::bigint
    from generate_series(v_start::timestamp, v_today::timestamp, interval '1 day') gs
    left join agg on agg.d = gs::date
   order by 1;
end;
$$;

-- -------------------------------------------------------------- distributions ---
create or replace function public.admin_distribution(_kind text)
returns table (label text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _kind is null or _kind not in
     ('seller_status', 'product_status', 'enquiry_status', 'quotation_status', 'category', 'user_role') then
    raise exception 'unknown distribution' using errcode = '22023';
  end if;

  if _kind = 'seller_status' then
    return query select s.verification_status::text, count(*)::bigint
                   from public.seller_profiles s group by 1 order by 2 desc, 1;
  elsif _kind = 'product_status' then
    return query select p.moderation_status::text, count(*)::bigint
                   from public.products p group by 1 order by 2 desc, 1;
  elsif _kind = 'enquiry_status' then
    return query select e.status::text, count(*)::bigint
                   from public.enquiries e group by 1 order by 2 desc, 1;
  elsif _kind = 'quotation_status' then
    return query select q.status::text, count(*)::bigint
                   from public.quotations q group by 1 order by 2 desc, 1;
  elsif _kind = 'user_role' then
    return query select r.role::text, count(*)::bigint
                   from public.user_roles r group by 1 order by 2 desc, 1;
  else
    return query select coalesce(c.name, 'Uncategorised')::text, count(*)::bigint
                   from public.products p
                   left join public.categories c on c.id = p.category_id
                  group by 1 order by 2 desc, 1 limit 12;
  end if;
end;
$$;

-- ---------------------------------------------------- moderation decision series ---
-- Decisions are read from the immutable audit log (the only place a decision
-- time is stored). Returns only buckets that have decisions; callers zero-fill.
create or replace function public.admin_moderation_series(_kind text, _days integer default 30)
returns table (bucket_date date, outcome text, total bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_days  integer := least(greatest(coalesce(_days, 30), 1), 366);
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_start date;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _kind is null or _kind not in ('product', 'seller') then
    raise exception 'unknown moderation kind' using errcode = '22023';
  end if;
  v_start := v_today - (v_days - 1);

  return query
  select (l.created_at at time zone 'Asia/Kolkata')::date,
         coalesce(l.metadata ->> 'to', 'unknown')::text,
         count(*)::bigint
    from public.admin_audit_logs l
   where l.action = case _kind when 'product' then 'product.moderate' else 'seller.review' end
     and (l.created_at at time zone 'Asia/Kolkata')::date >= v_start
   group by 1, 2
   order by 1, 2;
end;
$$;

-- ----------------------------------------------------------- category performance ---
create or replace function public.admin_category_performance()
returns table (
  category_id uuid, category_name text, parent_id uuid, is_active boolean,
  products bigint, approved_products bigint, enquiries bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return query
  select c.id, c.name::text, c.parent_id, c.is_active,
         count(distinct p.id)::bigint,
         (count(distinct p.id) filter (where p.moderation_status = 'approved'))::bigint,
         count(distinct e.id)::bigint
    from public.categories c
    left join public.products p  on p.category_id = c.id
    left join public.enquiries e on e.product_id = p.id
   group by c.id
   order by 5 desc, c.name;
end;
$$;

-- ------------------------------------------------------ category delete guard ---
-- Deleting a category is a destructive taxonomy change: super_admin only.
-- Service-role / migrations (auth.uid() is null) are unaffected. FK RESTRICT on
-- parent_id and products.category_id remains the last line of defence.
create or replace function public.categories_delete_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    raise exception 'only a super_admin can delete a category' using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists categories_delete_guard_trg on public.categories;
create trigger categories_delete_guard_trg before delete on public.categories
  for each row execute function public.categories_delete_guard();

-- ------------------------------------------------------------ function privileges ---
revoke all on function public.is_rfq_enquiry(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_set_platform_setting(text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.admin_restore_product(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_request_seller_documents(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_dashboard_metrics() from public, anon, authenticated;
revoke all on function public.admin_time_series(text, integer) from public, anon, authenticated;
revoke all on function public.admin_distribution(text) from public, anon, authenticated;
revoke all on function public.admin_moderation_series(text, integer) from public, anon, authenticated;
revoke all on function public.admin_category_performance() from public, anon, authenticated;
revoke all on function public.categories_delete_guard() from public, anon, authenticated;

grant execute on function public.is_rfq_enquiry(uuid, text) to authenticated;
grant execute on function public.admin_set_platform_setting(text, jsonb, boolean) to authenticated;
grant execute on function public.admin_restore_product(uuid, text) to authenticated;
grant execute on function public.admin_request_seller_documents(uuid, text) to authenticated;
grant execute on function public.admin_dashboard_metrics() to authenticated;
grant execute on function public.admin_time_series(text, integer) to authenticated;
grant execute on function public.admin_distribution(text) to authenticated;
grant execute on function public.admin_moderation_series(text, integer) to authenticated;
grant execute on function public.admin_category_performance() to authenticated;

comment on table public.platform_settings is
  'Admin-managed marketplace settings. Public read only when is_public. Writes only via admin_set_platform_setting() (super_admin).';
comment on function public.admin_set_platform_setting(text, jsonb, boolean) is
  'SECURITY DEFINER. super_admin only. Key whitelist, object JSON <= 16 KB. Audited with before/after.';

