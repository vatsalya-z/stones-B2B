-- ============================================================================
-- Migration: 20261102140000_orders_and_order_items.sql
-- Description: Phase 2 — Quotation Acceptance & Order Initiation (Payment Model B)
-- Scope:
--   1. Sequence order_number_seq for readable human identifiers (ORD-YYYYMMDD-XXXXX).
--   2. Tables: orders, order_items, order_status_history, buyer_addresses.
--   3. Immutability trigger guards (prevent_mutation, orders_immutability_guard, order_items_insert_guard).
--   4. Address sanitization & validation helper (sanitize_and_validate_order_address).
--   5. Atomic quotation acceptance RPC (accept_quotation_and_create_order).
--   6. Strict role-based order status transition RPC (transition_order_status).
--   7. Least privilege grants & RLS policies for buyer, seller, and admin roles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ORDER NUMBER SEQUENCE
-- ----------------------------------------------------------------------------
create sequence public.order_number_seq;

-- ----------------------------------------------------------------------------
-- 2. ORDERS TABLE
-- ----------------------------------------------------------------------------
create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null default ('ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
                         lpad(nextval('public.order_number_seq')::text, 5, '0')),
  quotation_id         uuid not null references public.quotations (id) on delete restrict,
  enquiry_id           uuid not null references public.enquiries (id) on delete restrict,
  buyer_id             uuid not null references public.profiles (id) on delete restrict,
  seller_id            uuid not null references public.seller_profiles (id) on delete restrict,

  buyer_snapshot       jsonb not null default '{}'::jsonb,
  seller_snapshot      jsonb not null default '{}'::jsonb,
  billing_address      jsonb not null default '{}'::jsonb,
  shipping_address     jsonb not null default '{}'::jsonb,
  delivery_location    text not null,

  subtotal             numeric(14, 2) not null check (subtotal >= 0),
  tax_amount           numeric(14, 2) not null default 0 check (tax_amount >= 0),
  shipping_charges     numeric(14, 2) not null default 0 check (shipping_charges >= 0),
  discount_amount      numeric(14, 2) not null default 0 check (discount_amount >= 0),
  total_amount         numeric(14, 2) not null check (total_amount >= 0),
  currency             text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  terms                text,

  status               text not null default 'pending_payment'
                       check (status in ('pending_payment', 'confirmed', 'processing', 'dispatched', 'delivered', 'completed', 'cancelled')),
  payment_status       text not null default 'pending'
                       check (payment_status in ('pending', 'processing', 'paid', 'failed', 'refunded')),

  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint orders_order_number_key unique (order_number),
  constraint orders_quotation_unique unique (quotation_id),
  constraint orders_discount_le_subtotal check (discount_amount <= subtotal),
  constraint orders_total_formula check (total_amount = subtotal - discount_amount + tax_amount + shipping_charges)
);

create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, status, created_at desc);
create index orders_enquiry_idx on public.orders (enquiry_id);
create index orders_delivery_location_idx on public.orders (delivery_location);

create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. ORDER ITEMS TABLE
-- ----------------------------------------------------------------------------
create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete restrict,
  product_id     uuid references public.products (id) on delete restrict,
  description    text not null check (char_length(description) between 1 and 1000),
  quantity       numeric(14, 3) not null check (quantity > 0),
  unit           text not null check (unit in ('sq_ft', 'sq_m', 'piece', 'ton', 'metric_ton', 'slab', 'box', 'custom')),
  unit_price     numeric(14, 2) not null check (unit_price >= 0),
  total_price    numeric(14, 2) not null check (total_price >= 0),
  specifications jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),

  constraint order_items_total_formula check (total_price = round(quantity * unit_price, 2))
);

create index order_items_order_idx on public.order_items (order_id);

-- ----------------------------------------------------------------------------
-- 4. ORDER STATUS HISTORY TABLE
-- ----------------------------------------------------------------------------
create table public.order_status_history (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete restrict,
  previous_status text check (previous_status is null or previous_status in
                    ('pending_payment', 'confirmed', 'processing', 'dispatched', 'delivered', 'completed', 'cancelled')),
  new_status      text not null check (new_status in
                    ('pending_payment', 'confirmed', 'processing', 'dispatched', 'delivered', 'completed', 'cancelled')),
  changed_by      uuid references public.profiles (id) on delete restrict,
  notes           text,
  created_at      timestamptz not null default now()
);

create index order_history_order_idx on public.order_status_history (order_id, created_at desc);

create trigger order_status_history_immutable before update or delete on public.order_status_history
  for each row execute function public.prevent_mutation();

-- ----------------------------------------------------------------------------
-- 5. BUYER SAVED ADDRESSES TABLE
-- ----------------------------------------------------------------------------
create table public.buyer_addresses (
  id            uuid primary key default gen_random_uuid(),
  buyer_id      uuid not null references public.profiles (id) on delete cascade,
  address_type  text not null default 'both' check (address_type in ('billing', 'shipping', 'project_site', 'both')),
  contact_name  text not null check (char_length(contact_name) between 2 and 120),
  phone         text not null check (phone ~ '^\+?[0-9\s\-()]{7,25}$'),
  company_name  text check (company_name is null or char_length(company_name) <= 160),
  gstin         text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  address_line1 text not null check (char_length(address_line1) between 5 and 250),
  address_line2 text check (address_line2 is null or char_length(address_line2) <= 250),
  city          text not null check (char_length(city) between 2 and 100),
  state         text not null check (char_length(state) between 2 and 100),
  pincode       text not null check (char_length(pincode) between 3 and 12),
  country       text not null default 'IN' check (country ~ '^[A-Z]{2}$'),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index buyer_addresses_buyer_idx on public.buyer_addresses (buyer_id, created_at desc);

create trigger buyer_addresses_set_updated_at before update on public.buyer_addresses
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. IMMUTABILITY GUARDS
-- ----------------------------------------------------------------------------
create or replace function public.orders_immutability_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.order_number is distinct from old.order_number
     or new.quotation_id is distinct from old.quotation_id
     or new.enquiry_id is distinct from old.enquiry_id
     or new.buyer_id is distinct from old.buyer_id
     or new.seller_id is distinct from old.seller_id
     or new.buyer_snapshot is distinct from old.buyer_snapshot
     or new.seller_snapshot is distinct from old.seller_snapshot
     or new.billing_address is distinct from old.billing_address
     or new.shipping_address is distinct from old.shipping_address
     or new.delivery_location is distinct from old.delivery_location
     or new.subtotal is distinct from old.subtotal
     or new.tax_amount is distinct from old.tax_amount
     or new.shipping_charges is distinct from old.shipping_charges
     or new.discount_amount is distinct from old.discount_amount
     or new.total_amount is distinct from old.total_amount
     or new.currency is distinct from old.currency
     or new.terms is distinct from old.terms
     or new.payment_status is distinct from old.payment_status
     or new.created_at is distinct from old.created_at then
    raise exception 'Order commercial terms, pricing, snapshots, and participant identifiers are strictly immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger orders_immutability_guard_trg before update on public.orders
  for each row execute function public.orders_immutability_guard();

create trigger order_items_prevent_mutation before update or delete on public.order_items
  for each row execute function public.prevent_mutation();

-- Guard ensuring order items can only be inserted during trusted order creation
create or replace function public.order_items_insert_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('stone.creating_order', true) is distinct from 'true' then
    raise exception 'Order items can only be created via the trusted order creation RPC' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger order_items_insert_guard_trg before insert on public.order_items
  for each row execute function public.order_items_insert_guard();

-- ----------------------------------------------------------------------------
-- 7. ADDRESS SANITIZATION & VALIDATION HELPER
-- ----------------------------------------------------------------------------
create or replace function public.sanitize_and_validate_order_address(
  _raw jsonb,
  _address_type text
) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_contact_name   text;
  v_phone          text;
  v_company_name   text;
  v_gstin          text;
  v_address_line1  text;
  v_address_line2  text;
  v_city           text;
  v_state          text;
  v_pincode        text;
  v_country        text;
  v_digits_count   integer;
begin
  if _raw is null or jsonb_typeof(_raw) <> 'object' then
    raise exception '% address must be a valid JSON object', initcap(_address_type) using errcode = '22023';
  end if;

  v_contact_name  := nullif(trim(coalesce(_raw->>'contactName', _raw->>'contact_name', '')), '');
  v_phone         := nullif(trim(coalesce(_raw->>'phone', '')), '');
  v_company_name  := nullif(trim(coalesce(_raw->>'companyName', _raw->>'company_name', '')), '');
  v_gstin         := nullif(trim(upper(coalesce(_raw->>'gstin', ''))), '');
  v_address_line1 := nullif(trim(coalesce(_raw->>'addressLine1', _raw->>'address_line1', '')), '');
  v_address_line2 := nullif(trim(coalesce(_raw->>'addressLine2', _raw->>'address_line2', '')), '');
  v_city          := nullif(trim(coalesce(_raw->>'city', '')), '');
  v_state         := nullif(trim(coalesce(_raw->>'state', '')), '');
  v_pincode       := nullif(trim(coalesce(_raw->>'pincode', '')), '');
  v_country       := coalesce(nullif(trim(upper(coalesce(_raw->>'country', ''))), ''), 'IN');

  if v_contact_name is null or char_length(v_contact_name) < 2 or char_length(v_contact_name) > 120 then
    raise exception '% contact name must be between 2 and 120 characters', initcap(_address_type) using errcode = '22023';
  end if;

  if v_phone is null then
    raise exception '% contact phone number is required', initcap(_address_type) using errcode = '22023';
  end if;
  v_digits_count := length(regexp_replace(v_phone, '\\D', '', 'g'));
  if v_digits_count < 10 or v_digits_count > 15 then
    raise exception '% phone must contain between 10 and 15 digits', initcap(_address_type) using errcode = '22023';
  end if;

  if v_address_line1 is null or char_length(v_address_line1) < 5 or char_length(v_address_line1) > 250 then
    raise exception '% address line 1 must be between 5 and 250 characters', initcap(_address_type) using errcode = '22023';
  end if;
  if v_address_line2 is not null and char_length(v_address_line2) > 250 then
    raise exception '% address line 2 cannot exceed 250 characters', initcap(_address_type) using errcode = '22023';
  end if;

  if v_city is null or char_length(v_city) < 2 or char_length(v_city) > 100 then
    raise exception '% city must be between 2 and 100 characters', initcap(_address_type) using errcode = '22023';
  end if;
  if v_state is null or char_length(v_state) < 2 or char_length(v_state) > 100 then
    raise exception '% state must be between 2 and 100 characters', initcap(_address_type) using errcode = '22023';
  end if;

  if v_country !~ '^[A-Z]{2}$' then
    raise exception '% country must be a valid 2-letter ISO code', initcap(_address_type) using errcode = '22023';
  end if;

  if v_pincode is null then
    raise exception '% postal / PIN code is required', initcap(_address_type) using errcode = '22023';
  end if;
  if v_country = 'IN' then
    if v_pincode !~ '^[1-9][0-9]{5}$' then
      raise exception '% delivery PIN code must be exactly 6 digits starting with 1-9', initcap(_address_type) using errcode = '22023';
    end if;
  else
    if v_pincode !~ '^[A-Za-z0-9\\s\\-]{3,12}$' then
      raise exception '% international postal code must be between 3 and 12 alphanumeric characters', initcap(_address_type) using errcode = '22023';
    end if;
  end if;

  if v_gstin is not null then
    if v_country = 'IN' then
      if v_gstin !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$' then
        raise exception 'Invalid GSTIN format on % address', _address_type using errcode = '22023';
      end if;
    else
      v_gstin := null;
    end if;
  end if;

  return jsonb_build_object(
    'contact_name', v_contact_name,
    'phone', v_phone,
    'company_name', v_company_name,
    'gstin', v_gstin,
    'address_line1', v_address_line1,
    'address_line2', v_address_line2,
    'city', v_city,
    'state', v_state,
    'pincode', v_pincode,
    'country', v_country
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 8. ORDER STATUS TRANSITION RPC
-- ----------------------------------------------------------------------------
create or replace function public.transition_order_status(
  _order_id    uuid,
  _new_status  text,
  _notes       text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order     public.orders;
  v_is_buyer  boolean;
  v_is_seller boolean;
  v_is_admin  boolean;
  v_allowed   boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.current_account_active() then
    raise exception 'Account is inactive' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = _order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status = _new_status then
    return;
  end if;

  v_is_buyer  := (v_order.buyer_id = auth.uid());
  v_is_seller := public.is_seller_owner(v_order.seller_id);
  v_is_admin  := public.is_admin();

  if v_is_buyer then
    v_allowed := v_allowed
      or (v_order.status = 'pending_payment' and _new_status = 'cancelled')
      or (v_order.status = 'dispatched' and _new_status = 'delivered');
  end if;

  if v_is_seller then
    v_allowed := v_allowed
      or (v_order.status = 'pending_payment' and _new_status = 'confirmed')
      or (v_order.status = 'confirmed' and _new_status = 'processing')
      or (v_order.status = 'processing' and _new_status = 'dispatched');
  end if;

  if v_is_admin then
    v_allowed := v_allowed
      or (v_order.status in ('pending_payment', 'confirmed', 'processing') and _new_status = 'cancelled')
      or (v_order.status = 'delivered' and _new_status = 'completed');
  end if;

  if not v_allowed then
    raise exception 'Order transition from "%" to "%" is not authorized for your role',
      v_order.status, _new_status using errcode = '42501';
  end if;

  update public.orders
  set status = _new_status, notes = coalesce(_notes, notes), updated_at = now()
  where id = v_order.id;

  insert into public.order_status_history (order_id, previous_status, new_status, changed_by, notes)
  values (v_order.id, v_order.status, _new_status, auth.uid(), _notes);

  if v_is_buyer and _new_status = 'cancelled' then
    perform public._emit_notification(
      (select user_id from public.seller_profiles where id = v_order.seller_id),
      'Order Cancelled: ' || v_order.order_number,
      'Buyer has cancelled order ' || v_order.order_number || ' prior to payment.',
      'system', v_order.id, 5
    );
  elsif v_is_buyer and _new_status = 'delivered' then
    perform public._emit_notification(
      (select user_id from public.seller_profiles where id = v_order.seller_id),
      'Delivery Confirmed: ' || v_order.order_number,
      'Buyer has confirmed receipt of order ' || v_order.order_number || '.',
      'system', v_order.id, 5
    );
  elsif v_is_seller and _new_status = 'dispatched' then
    perform public._emit_notification(
      v_order.buyer_id,
      'Order Dispatched: ' || v_order.order_number,
      'Supplier has dispatched your consignment for order ' || v_order.order_number || '.',
      'system', v_order.id, 5
    );
  elsif v_is_seller and _new_status = 'confirmed' then
    perform public._emit_notification(
      v_order.buyer_id,
      'Order Confirmed: ' || v_order.order_number,
      'Supplier has accepted and confirmed order ' || v_order.order_number || '.',
      'system', v_order.id, 5
    );
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. ATOMIC QUOTATION ACCEPTANCE & ORDER INITIATION RPC
-- ----------------------------------------------------------------------------
create or replace function public.accept_quotation_and_create_order(
  _quotation_id     uuid,
  _billing_address  jsonb,
  _shipping_address jsonb default null,
  _same_as_billing  boolean default false,
  _notes            text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_quote             public.quotations;
  v_enquiry           public.enquiries;
  v_buyer             public.profiles;
  v_seller            public.seller_profiles;
  v_seller_user       public.profiles;
  v_existing_order_id uuid;
  v_order_id          uuid;
  v_order_number      text;
  v_clean_billing     jsonb;
  v_clean_shipping    jsonb;
  v_canonical_loc     text;
  v_effective_tax_bps integer := 0;
  v_item              record;
  v_item_specs        jsonb;
  v_items_count       integer := 0;
  v_items_subtotal    numeric(14, 2) := 0;
  v_effective_expiry  timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.current_account_active() then
    raise exception 'Account is inactive' using errcode = '42501';
  end if;

  select * into v_quote from public.quotations where id = _quotation_id for update;
  if not found then
    raise exception 'Quotation not found' using errcode = 'P0002';
  end if;

  -- Idempotency check: if already accepted, return existing order
  if v_quote.status = 'accepted' then
    select id into v_existing_order_id
    from public.orders
    where quotation_id = _quotation_id and buyer_id = auth.uid();

    if v_existing_order_id is not null then
      return v_existing_order_id;
    else
      raise exception 'Quotation is already accepted under another authorization' using errcode = '42501';
    end if;
  end if;

  if v_quote.buyer_id <> auth.uid() then
    raise exception 'Only the designated recipient buyer can accept this quotation' using errcode = '42501';
  end if;

  if v_quote.status not in ('sent', 'viewed') then
    raise exception 'Quotation cannot be accepted in "%" status', v_quote.status using errcode = '42501';
  end if;

  v_effective_expiry := coalesce(v_quote.valid_until, v_quote.created_at + interval '30 days');
  if v_effective_expiry <= now() then
    raise exception 'Quotation has expired' using errcode = '22023';
  end if;

  select * into v_enquiry from public.enquiries where id = v_quote.enquiry_id;
  if not found or v_enquiry.buyer_id <> v_quote.buyer_id or v_enquiry.seller_id <> v_quote.seller_id then
    raise exception 'Quotation enquiry relationship is inconsistent' using errcode = '23503';
  end if;

  if v_enquiry.status in ('closed', 'cancelled') then
    raise exception 'Cannot accept quotation for an enquiry that is %', v_enquiry.status using errcode = '42501';
  end if;

  select * into v_seller from public.seller_profiles where id = v_quote.seller_id;
  if not found or v_seller.verification_status <> 'verified' then
    raise exception 'Supplier is not currently verified on the platform' using errcode = '42501';
  end if;

  select * into v_seller_user from public.profiles where id = v_seller.user_id;
  if not found or v_seller_user.account_status <> 'active' then
    raise exception 'Supplier account is currently inactive' using errcode = '42501';
  end if;

  v_clean_billing := public.sanitize_and_validate_order_address(_billing_address, 'billing');

  if coalesce(_same_as_billing, false) then
    v_clean_shipping := v_clean_billing;
  else
    if _shipping_address is null or _shipping_address = '{}'::jsonb then
      raise exception 'Shipping address is required when same_as_billing is false' using errcode = '22023';
    end if;
    v_clean_shipping := public.sanitize_and_validate_order_address(_shipping_address, 'shipping');
  end if;

  v_canonical_loc := coalesce(
    nullif(trim(v_enquiry.delivery_location), ''),
    (v_clean_shipping->>'city') || ', ' || (v_clean_shipping->>'state') || ' (' || (v_clean_shipping->>'country') || ')'
  );

  if v_quote.tax_amount > 0 and (v_quote.subtotal - v_quote.discount_amount) > 0 then
    v_effective_tax_bps := round((v_quote.tax_amount / (v_quote.subtotal - v_quote.discount_amount)) * 10000);
  end if;

  select * into v_buyer from public.profiles where id = v_quote.buyer_id;

  update public.quotations
  set status = 'accepted', updated_at = now()
  where id = v_quote.id;

  insert into public.orders (
    quotation_id,
    enquiry_id,
    buyer_id,
    seller_id,
    buyer_snapshot,
    seller_snapshot,
    billing_address,
    shipping_address,
    delivery_location,
    subtotal,
    tax_amount,
    shipping_charges,
    discount_amount,
    total_amount,
    currency,
    terms,
    status,
    payment_status,
    notes
  ) values (
    v_quote.id,
    v_quote.enquiry_id,
    v_quote.buyer_id,
    v_quote.seller_id,
    jsonb_build_object(
      'full_name', v_buyer.full_name,
      'email', v_buyer.email,
      'phone', v_buyer.phone
    ),
    jsonb_build_object(
      'business_name', v_seller.business_name,
      'gst_number', v_seller.gst_number,
      'business_email', v_seller.business_email,
      'phone', v_seller.phone,
      'business_address', v_seller.business_address,
      'city', v_seller.city,
      'state', v_seller.state,
      'pincode', v_seller.pincode,
      'country', v_seller.country
    ),
    v_clean_billing,
    v_clean_shipping,
    v_canonical_loc,
    v_quote.subtotal,
    v_quote.tax_amount,
    v_quote.shipping_charges,
    v_quote.discount_amount,
    v_quote.total_amount,
    v_quote.currency,
    v_quote.terms,
    'pending_payment',
    'pending',
    _notes
  ) returning id, order_number into v_order_id, v_order_number;

  -- Set session flag so order_items_insert_guard permits insert inside this transaction
  perform set_config('stone.creating_order', 'true', true);

  for v_item in
    select product_id, description, quantity, unit, unit_price, total_price
    from public.quotation_items
    where quotation_id = v_quote.id
  loop
    v_item_specs := jsonb_build_object(
      'tax_rate_bps', v_effective_tax_bps
    );

    insert into public.order_items (
      order_id, product_id, description, quantity, unit, unit_price, total_price, specifications
    ) values (
      v_order_id, v_item.product_id, v_item.description, v_item.quantity, v_item.unit,
      v_item.unit_price, v_item.total_price, v_item_specs
    );

    v_items_count := v_items_count + 1;
    v_items_subtotal := v_items_subtotal + v_item.total_price;
  end loop;

  if v_items_count = 0 or v_items_subtotal <> v_quote.subtotal then
    raise exception 'Quotation items do not add up to the subtotal' using errcode = '23514';
  end if;

  insert into public.order_status_history (order_id, previous_status, new_status, changed_by, notes)
  values (v_order_id, null, 'pending_payment', auth.uid(), 'Order initiated from accepted quotation');

  perform public._emit_notification(
    v_seller.user_id,
    'Quotation Accepted: Order ' || v_order_number,
    'Buyer has accepted quotation ' || v_quote.quote_number || '. Order ' || v_order_number || ' has been initiated.',
    'quotation_accepted',
    v_order_id,
    5
  );

  perform public._emit_notification(
    v_quote.buyer_id,
    'Order Initiated: ' || v_order_number,
    'Your order ' || v_order_number || ' has been initiated and is awaiting payment/commercial confirmation.',
    'system',
    v_order_id,
    5
  );

  return v_order_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 10. LEAST PRIVILEGE GRANTS & RLS POLICIES
-- ----------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.buyer_addresses enable row level security;

-- Revoke all by default
revoke all on table public.orders from public, anon, authenticated;
revoke all on table public.order_items from public, anon, authenticated;
revoke all on table public.order_status_history from public, anon, authenticated;
revoke all on table public.buyer_addresses from public, anon, authenticated;
revoke all on sequence public.order_number_seq from public, anon, authenticated;

-- Grant selective read-only to authenticated for orders, items, history
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.order_status_history to authenticated;
grant usage on sequence public.order_number_seq to authenticated;

-- Grant full CRUD on buyer_addresses to authenticated (scoped by RLS)
grant select, insert, update, delete on public.buyer_addresses to authenticated;

-- Function execution grants
revoke all on function public.sanitize_and_validate_order_address(jsonb, text) from public, anon, authenticated;
grant execute on function public.sanitize_and_validate_order_address(jsonb, text) to authenticated;

revoke all on function public.transition_order_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.transition_order_status(uuid, text, text) to authenticated;

revoke all on function public.accept_quotation_and_create_order(uuid, jsonb, jsonb, boolean, text) from public, anon, authenticated;
grant execute on function public.accept_quotation_and_create_order(uuid, jsonb, jsonb, boolean, text) to authenticated;

-- RLS Policies: orders
create policy orders_select_buyer on public.orders
  for select to authenticated using (buyer_id = auth.uid());

create policy orders_select_seller on public.orders
  for select to authenticated using (public.is_seller_owner(seller_id));

create policy orders_select_admin on public.orders
  for select to authenticated using (public.is_admin());

-- RLS Policies: order_items
create policy order_items_select on public.order_items
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.buyer_id = auth.uid() or public.is_seller_owner(o.seller_id) or public.is_admin())
    )
  );

-- RLS Policies: order_status_history
create policy order_status_history_select on public.order_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_status_history.order_id
        and (o.buyer_id = auth.uid() or public.is_seller_owner(o.seller_id) or public.is_admin())
    )
  );

-- RLS Policies: buyer_addresses
create policy buyer_addresses_select on public.buyer_addresses
  for select to authenticated using (buyer_id = auth.uid());

create policy buyer_addresses_insert on public.buyer_addresses
  for insert to authenticated with check (buyer_id = auth.uid());

create policy buyer_addresses_update on public.buyer_addresses
  for update to authenticated using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());

create policy buyer_addresses_delete on public.buyer_addresses
  for delete to authenticated using (buyer_id = auth.uid());
