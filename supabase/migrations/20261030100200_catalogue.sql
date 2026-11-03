-- =============================================================================
-- Migration 3: catalogue (categories, products, images, specifications, favourites)
-- Public visibility rule: moderation_status = 'approved' AND seller is verified.
-- =============================================================================

create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid references public.categories (id) on delete restrict,
  name            text not null check (char_length(name) between 2 and 120),
  slug            text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description     text,
  image_url       text,
  is_active       boolean not null default true,
  display_order   integer not null default 0,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint categories_slug_key unique (slug),
  constraint categories_not_self_parent check (parent_id is distinct from id)
);
create index categories_parent_idx on public.categories (parent_id);
create index categories_active_order_idx on public.categories (is_active, display_order);
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id                     uuid primary key default gen_random_uuid(),
  seller_id              uuid not null references public.seller_profiles (id) on delete restrict,
  category_id            uuid references public.categories (id) on delete restrict,
  name                   text not null check (char_length(name) between 3 and 200),
  slug                   text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 160),
  sku                    text,
  description            text,
  material_type          text,
  stone_origin           text,
  colour                 text,
  finish                 text,
  thickness              numeric(10, 2) check (thickness is null or thickness > 0),  -- millimetres
  length                 numeric(10, 2) check (length is null or length > 0),        -- millimetres
  width                  numeric(10, 2) check (width is null or width > 0),          -- millimetres
  minimum_order_quantity numeric(14, 3) check (minimum_order_quantity is null or minimum_order_quantity > 0),
  unit                   text not null default 'sq_ft'
                         check (unit in ('sq_ft', 'sq_m', 'piece', 'ton', 'metric_ton', 'slab', 'box', 'custom')),
  price_type             text not null default 'on_request'
                         check (price_type in ('fixed', 'starting', 'on_request', 'negotiable')),
  price                  numeric(14, 2),
  currency               text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  stock_status           text not null default 'in_stock'
                         check (stock_status in ('in_stock', 'limited', 'out_of_stock', 'made_to_order')),
  lead_time              integer check (lead_time is null or lead_time >= 0),         -- days
  moderation_status      text not null default 'draft'
                         check (moderation_status in ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  rejection_reason       text,
  published_at           timestamptz,
  search_vector          tsvector generated always as (
                           to_tsvector('simple',
                             coalesce(name, '') || ' ' || coalesce(material_type, '') || ' ' ||
                             coalesce(stone_origin, '') || ' ' || coalesce(colour, '') || ' ' ||
                             coalesce(finish, '') || ' ' || coalesce(description, ''))
                         ) stored,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint products_slug_key unique (slug),
  constraint products_price_rule check (
    (price_type = 'on_request' and price is null) or
    (price_type <> 'on_request' and price is not null and price >= 0)),
  constraint products_approved_has_published_at check (moderation_status <> 'approved' or published_at is not null)
);
create unique index products_seller_sku_key on public.products (seller_id, sku) where sku is not null;
create index products_seller_idx on public.products (seller_id, moderation_status);
create index products_category_idx on public.products (category_id);
create index products_public_idx on public.products (published_at desc) where moderation_status = 'approved';
create index products_price_idx on public.products (price) where moderation_status = 'approved';
create index products_search_idx on public.products using gin (search_vector);
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  storage_path  text not null,
  alt_text      text,
  is_primary    boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  constraint product_images_path_key unique (storage_path)
);
create index product_images_product_idx on public.product_images (product_id, display_order);
create unique index product_images_one_primary_idx on public.product_images (product_id) where is_primary;

create table public.product_specifications (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products (id) on delete cascade,
  specification_name  text not null check (char_length(specification_name) between 1 and 100),
  specification_value text not null check (char_length(specification_value) between 1 and 500),
  display_order       integer not null default 0,
  constraint product_specs_name_key unique (product_id, specification_name)
);
create index product_specs_product_idx on public.product_specifications (product_id, display_order);

create table public.product_favourites (
  id         uuid primary key default gen_random_uuid(),
  buyer_id   uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint product_favourites_unique unique (buyer_id, product_id)
);
create index product_favourites_product_idx on public.product_favourites (product_id);

-- ------------------------------------------------------------------ helpers ---
-- Boolean-only visibility helpers; safe for anonymous callers.
create or replace function public.is_product_public(_product_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.products p
    join public.seller_profiles s on s.id = p.seller_id
    where p.id = _product_id and p.moderation_status = 'approved' and s.verification_status = 'verified'
  );
$$;

create or replace function public.is_product_owner(_product_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.products p where p.id = _product_id and public.is_seller_owner(p.seller_id)
  );
$$;

-- Product moderation guard (direct client writes only; trusted functions/service role bypass).
--  * sellers can only create draft/pending_review, never approve/reject or set published_at
--  * editing an approved product sends it back to pending_review (no bait-and-switch)
--  * only a verified seller may submit for review
create or replace function public.products_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' or public.is_admin() then
    if new.moderation_status = 'approved' and (tg_op = 'INSERT' or old.moderation_status <> 'approved') then
      new.published_at := coalesce(new.published_at, now());
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.moderation_status not in ('draft', 'pending_review') then
      raise exception 'sellers cannot set status %', new.moderation_status using errcode = '42501';
    end if;
    new.published_at := null;
    new.rejection_reason := null;
  else
    if new.published_at is distinct from old.published_at
       or new.rejection_reason is distinct from old.rejection_reason
       or new.seller_id <> old.seller_id then
      raise exception 'protected product fields cannot be changed' using errcode = '42501';
    end if;
    if new.moderation_status in ('approved', 'rejected') and new.moderation_status <> old.moderation_status then
      raise exception 'sellers cannot approve or reject products' using errcode = '42501';
    end if;
    if old.moderation_status = 'approved' and new.moderation_status = 'approved' then
      new.moderation_status := 'pending_review';
    elsif old.moderation_status = 'rejected' and new.moderation_status = 'rejected' then
      new.moderation_status := 'draft';
    end if;
  end if;

  if new.moderation_status = 'pending_review' and not public.is_seller_verified(new.seller_id) then
    raise exception 'seller must be verified to submit products for review' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger products_guard_trg before insert or update on public.products
  for each row execute function public.products_guard();

-- Image paths must be "<seller_id>/<product_id>/<file>" for the owning product.
create or replace function public.product_images_validate_path()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_seller uuid;
begin
  select seller_id into v_seller from public.products where id = new.product_id;
  if split_part(new.storage_path, '/', 1) <> v_seller::text
     or split_part(new.storage_path, '/', 2) <> new.product_id::text then
    raise exception 'storage_path must start with <seller_id>/<product_id>/' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger product_images_validate_path_trg before insert or update of storage_path, product_id
  on public.product_images for each row execute function public.product_images_validate_path();

-- Changing images/specs of an approved product by its seller re-triggers review.
-- Plain invoker function: it only does what the seller could already do directly
-- (approved -> pending_review), and is skipped for admins/service role.
create or replace function public.reset_product_review_on_child_change()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
begin
  if current_user = 'authenticated' and not public.is_admin() then
    update public.products set moderation_status = 'pending_review'
     where id = v_product and moderation_status = 'approved';
  end if;
  return null;
end;
$$;
create trigger product_images_reset_review_trg after insert or update or delete on public.product_images
  for each row execute function public.reset_product_review_on_child_change();
create trigger product_specs_reset_review_trg after insert or update or delete on public.product_specifications
  for each row execute function public.reset_product_review_on_child_change();

-- Admin moderation (approve / reject / archive) with audit trail.
create or replace function public.admin_moderate_product(_product_id uuid, _status text, _reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.products;
  ok boolean;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  select * into p from public.products where id = _product_id for update;
  if not found then
    raise exception 'product not found' using errcode = 'P0002';
  end if;
  ok := (p.moderation_status = 'pending_review' and _status in ('approved', 'rejected'))
     or (_status = 'archived' and p.moderation_status <> 'archived');
  if not ok then
    raise exception 'invalid transition % -> %', p.moderation_status, _status using errcode = '22023';
  end if;
  if _status in ('rejected', 'archived') and nullif(trim(_reason), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  update public.products
     set moderation_status = _status,
         rejection_reason = case when _status = 'approved' then null else _reason end
   where id = _product_id;
  perform public._write_audit_log('product.moderate', 'product', _product_id,
    jsonb_build_object('from', p.moderation_status, 'to', _status, 'reason', _reason));
end;
$$;

-- Audit direct admin writes to categories.
create or replace function public.categories_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and public.is_admin() then
    perform public._write_audit_log('category.' || lower(tg_op), 'category',
      coalesce(new.id, old.id), jsonb_build_object('name', coalesce(new.name, old.name)));
  end if;
  return null;
end;
$$;
create trigger categories_audit_trg after insert or update or delete on public.categories
  for each row execute function public.categories_audit();

-- --------------------------------------------------------- privileges + RLS ---
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_specifications enable row level security;
alter table public.product_favourites enable row level security;
revoke all on table public.categories from public, anon, authenticated;
revoke all on table public.products from public, anon, authenticated;
revoke all on table public.product_images from public, anon, authenticated;
revoke all on table public.product_specifications from public, anon, authenticated;
revoke all on table public.product_favourites from public, anon, authenticated;

-- categories: public reads active rows; admins manage.
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
create policy categories_select_active on public.categories
  for select to anon, authenticated using (is_active);
create policy categories_select_admin on public.categories
  for select to authenticated using (public.is_admin());
create policy categories_admin_insert on public.categories
  for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.categories
  for delete to authenticated using (public.is_admin());

-- products
grant select on public.products to anon, authenticated;
grant insert (seller_id, category_id, name, slug, sku, description, material_type, stone_origin,
              colour, finish, thickness, length, width, minimum_order_quantity, unit, price_type,
              price, currency, stock_status, lead_time, moderation_status)
  on public.products to authenticated;
grant update (category_id, name, slug, sku, description, material_type, stone_origin,
              colour, finish, thickness, length, width, minimum_order_quantity, unit, price_type,
              price, currency, stock_status, lead_time, moderation_status)
  on public.products to authenticated;
grant delete on public.products to authenticated;

create policy products_select_public on public.products
  for select to anon, authenticated
  using (moderation_status = 'approved' and public.is_seller_verified(seller_id));
create policy products_select_owner on public.products
  for select to authenticated using (public.is_seller_owner(seller_id));
create policy products_select_admin on public.products
  for select to authenticated using (public.is_admin());
create policy products_insert_owner on public.products
  for insert to authenticated with check (public.is_seller_owner(seller_id));
create policy products_update_owner on public.products
  for update to authenticated
  using (public.is_seller_owner(seller_id))
  with check (public.is_seller_owner(seller_id));
create policy products_delete_owner on public.products
  for delete to authenticated
  using (public.is_seller_owner(seller_id) and moderation_status = 'draft');

-- product_images / product_specifications
grant select on public.product_images, public.product_specifications to anon, authenticated;
grant insert (product_id, storage_path, alt_text, is_primary, display_order)
  on public.product_images to authenticated;
grant update (alt_text, is_primary, display_order) on public.product_images to authenticated;
grant delete on public.product_images to authenticated;
grant insert (product_id, specification_name, specification_value, display_order)
  on public.product_specifications to authenticated;
grant update (specification_name, specification_value, display_order)
  on public.product_specifications to authenticated;
grant delete on public.product_specifications to authenticated;

create policy product_images_select_public on public.product_images
  for select to anon, authenticated using (public.is_product_public(product_id));
create policy product_images_select_owner on public.product_images
  for select to authenticated using (public.is_product_owner(product_id));
create policy product_images_select_admin on public.product_images
  for select to authenticated using (public.is_admin());
create policy product_images_insert_owner on public.product_images
  for insert to authenticated with check (public.is_product_owner(product_id));
create policy product_images_update_owner on public.product_images
  for update to authenticated
  using (public.is_product_owner(product_id)) with check (public.is_product_owner(product_id));
create policy product_images_delete_owner on public.product_images
  for delete to authenticated using (public.is_product_owner(product_id));

create policy product_specs_select_public on public.product_specifications
  for select to anon, authenticated using (public.is_product_public(product_id));
create policy product_specs_select_owner on public.product_specifications
  for select to authenticated using (public.is_product_owner(product_id));
create policy product_specs_select_admin on public.product_specifications
  for select to authenticated using (public.is_admin());
create policy product_specs_insert_owner on public.product_specifications
  for insert to authenticated with check (public.is_product_owner(product_id));
create policy product_specs_update_owner on public.product_specifications
  for update to authenticated
  using (public.is_product_owner(product_id)) with check (public.is_product_owner(product_id));
create policy product_specs_delete_owner on public.product_specifications
  for delete to authenticated using (public.is_product_owner(product_id));

-- favourites: strictly own rows; only published products can be saved.
grant select, delete on public.product_favourites to authenticated;
grant insert (buyer_id, product_id) on public.product_favourites to authenticated;
create policy favourites_select_own on public.product_favourites
  for select to authenticated using (buyer_id = auth.uid());
create policy favourites_insert_own on public.product_favourites
  for insert to authenticated
  with check (buyer_id = auth.uid() and public.current_account_active() and public.is_product_public(product_id));
create policy favourites_delete_own on public.product_favourites
  for delete to authenticated using (buyer_id = auth.uid());

-- ---------------------------------------------------------- function privileges ---
revoke all on function public.is_product_public(uuid) from public, anon, authenticated;
revoke all on function public.is_product_owner(uuid)  from public, anon, authenticated;
revoke all on function public.products_guard()        from public, anon, authenticated;
revoke all on function public.product_images_validate_path() from public, anon, authenticated;
revoke all on function public.reset_product_review_on_child_change() from public, anon, authenticated;
revoke all on function public.admin_moderate_product(uuid, text, text) from public, anon, authenticated;
revoke all on function public.categories_audit()      from public, anon, authenticated;
grant execute on function public.is_product_public(uuid) to anon, authenticated;
grant execute on function public.is_product_owner(uuid)  to authenticated;
grant execute on function public.admin_moderate_product(uuid, text, text) to authenticated;
