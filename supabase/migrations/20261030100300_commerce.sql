-- =============================================================================
-- Migration 4: enquiries, status history, quotations, quotation items
-- Commercial records use ON DELETE RESTRICT everywhere (never cascaded away).
-- Clients cannot UPDATE enquiries directly; status moves only through
-- transition_enquiry_status() or quotation actions.
-- =============================================================================

create table public.enquiries (
  id                     uuid primary key default gen_random_uuid(),
  buyer_id               uuid not null references public.profiles (id) on delete restrict,
  seller_id              uuid not null references public.seller_profiles (id) on delete restrict,
  product_id             uuid references public.products (id) on delete restrict,
  enquiry_title          text not null check (char_length(enquiry_title) between 3 and 200),
  description            text not null check (char_length(description) between 1 and 5000),
  quantity               numeric(14, 3) not null check (quantity > 0),
  unit                   text not null check (unit in ('sq_ft', 'sq_m', 'piece', 'ton', 'metric_ton', 'slab', 'box', 'custom')),
  expected_budget        numeric(14, 2) check (expected_budget is null or expected_budget >= 0),
  currency               text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  delivery_location      text,
  required_delivery_date date,
  status                 text not null default 'submitted'
                         check (status in ('submitted', 'viewed', 'responding', 'quoted', 'accepted', 'rejected', 'closed', 'cancelled')),
  -- Client-generated idempotency key: repeated clicks/retries cannot create duplicates.
  client_request_id      uuid,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint enquiries_idempotency_key unique (buyer_id, client_request_id)
);
create index enquiries_buyer_idx on public.enquiries (buyer_id, created_at desc);
create index enquiries_seller_idx on public.enquiries (seller_id, status, created_at desc);
create index enquiries_product_idx on public.enquiries (product_id);
create trigger enquiries_set_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

create table public.enquiry_status_history (
  id              uuid primary key default gen_random_uuid(),
  enquiry_id      uuid not null references public.enquiries (id) on delete restrict,
  previous_status text check (previous_status is null or previous_status in
                    ('submitted', 'viewed', 'responding', 'quoted', 'accepted', 'rejected', 'closed', 'cancelled')),
  new_status      text not null check (new_status in
                    ('submitted', 'viewed', 'responding', 'quoted', 'accepted', 'rejected', 'closed', 'cancelled')),
  changed_by      uuid references public.profiles (id) on delete restrict,
  notes           text,
  created_at      timestamptz not null default now()
);
create index enquiry_history_enquiry_idx on public.enquiry_status_history (enquiry_id, created_at);
create trigger enquiry_status_history_immutable before update or delete on public.enquiry_status_history
  for each row execute function public.prevent_mutation();

create sequence public.quotation_number_seq;

create table public.quotations (
  id               uuid primary key default gen_random_uuid(),
  enquiry_id       uuid not null references public.enquiries (id) on delete restrict,
  seller_id        uuid not null references public.seller_profiles (id) on delete restrict,
  buyer_id         uuid not null references public.profiles (id) on delete restrict,
  quote_number     text not null default ('QT-' || to_char(now(), 'YYYY') || '-' ||
                     lpad(nextval('public.quotation_number_seq')::text, 6, '0')),
  subtotal         numeric(14, 2) not null check (subtotal >= 0),
  tax_amount       numeric(14, 2) not null default 0 check (tax_amount >= 0),
  shipping_charges numeric(14, 2) not null default 0 check (shipping_charges >= 0),
  discount_amount  numeric(14, 2) not null default 0 check (discount_amount >= 0),
  total_amount     numeric(14, 2) not null check (total_amount >= 0),
  currency         text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  valid_until      timestamptz,
  terms            text,
  status           text not null default 'draft'
                   check (status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised', 'cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint quotations_number_key unique (quote_number),
  constraint quotations_discount_le_subtotal check (discount_amount <= subtotal),
  constraint quotations_total_formula check (total_amount = subtotal - discount_amount + tax_amount + shipping_charges)
);
create index quotations_enquiry_idx on public.quotations (enquiry_id);
create index quotations_seller_idx on public.quotations (seller_id, status);
create index quotations_buyer_idx on public.quotations (buyer_id, status);
create trigger quotations_set_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();

create table public.quotation_items (
  id           uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete restrict,
  product_id   uuid references public.products (id) on delete restrict,
  description  text not null check (char_length(description) between 1 and 1000),
  quantity     numeric(14, 3) not null check (quantity > 0),
  unit         text not null check (unit in ('sq_ft', 'sq_m', 'piece', 'ton', 'metric_ton', 'slab', 'box', 'custom')),
  unit_price   numeric(14, 2) not null check (unit_price >= 0),
  total_price  numeric(14, 2) not null check (total_price >= 0),
  constraint quotation_items_total_formula check (total_price = round(quantity * unit_price, 2))
);
create index quotation_items_quotation_idx on public.quotation_items (quotation_id);

-- ------------------------------------------------------------------ helpers ---
create or replace function public.can_access_enquiry(_enquiry_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enquiries e
    where e.id = _enquiry_id
      and (e.buyer_id = auth.uid() or public.is_seller_owner(e.seller_id) or public.is_admin())
  );
$$;

-- Buyer's product/seller consistency for new enquiries.
create or replace function public.product_matches_seller(_product_id uuid, _seller_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.products p where p.id = _product_id and p.seller_id = _seller_id)
     and public.is_product_public(_product_id);
$$;

-- Sellers may see profile rows of buyers who have enquired with them (and only those).
create or replace function public.seller_can_see_buyer(_buyer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enquiries e
    where e.buyer_id = _buyer_id and public.is_seller_owner(e.seller_id)
  );
$$;
create policy profiles_select_enquiry_buyer on public.profiles
  for select to authenticated using (public.seller_can_see_buyer(id));

create or replace function public.can_quote_enquiry(_enquiry_id uuid, _seller_id uuid, _buyer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enquiries e
    where e.id = _enquiry_id and e.seller_id = _seller_id and e.buyer_id = _buyer_id
      and e.status in ('submitted', 'viewed', 'responding', 'quoted')
  );
$$;

create or replace function public.can_view_quotation(_quotation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quotations q
    where q.id = _quotation_id
      and (public.is_seller_owner(q.seller_id)
           or (q.buyer_id = auth.uid() and q.status <> 'draft')
           or public.is_admin())
  );
$$;

create or replace function public.is_draft_quotation_owner(_quotation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quotations q
    where q.id = _quotation_id and q.status = 'draft' and public.is_seller_owner(q.seller_id)
  );
$$;

-- Internal status mover (no authorization!): used by trusted functions/triggers.
create or replace function public._set_enquiry_status(_enquiry_id uuid, _new text, _actor uuid, _notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_old text;
begin
  select status into v_old from public.enquiries where id = _enquiry_id for update;
  if not found or v_old = _new then
    return;
  end if;
  update public.enquiries set status = _new where id = _enquiry_id;
  insert into public.enquiry_status_history (enquiry_id, previous_status, new_status, changed_by, notes)
  values (_enquiry_id, v_old, _new, _actor, _notes);
end;
$$;

create or replace function public.enquiries_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.enquiry_status_history (enquiry_id, previous_status, new_status, changed_by, notes)
  values (new.id, null, new.status, new.buyer_id, 'Enquiry submitted');
  return null;
end;
$$;
create trigger enquiries_after_insert_trg after insert on public.enquiries
  for each row execute function public.enquiries_after_insert();

-- Participant-driven transitions. 'quoted'/'accepted' are reachable only via quotations.
create or replace function public.transition_enquiry_status(_enquiry_id uuid, _new_status text, _notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e public.enquiries;
  v_buyer boolean;
  v_seller boolean;
  v_admin boolean;
  ok boolean := false;
begin
  select * into e from public.enquiries where id = _enquiry_id for update;
  if not found or not public.can_access_enquiry(_enquiry_id) then
    raise exception 'enquiry not found' using errcode = 'P0002';
  end if;
  v_buyer  := e.buyer_id = auth.uid();
  v_seller := public.is_seller_owner(e.seller_id);
  v_admin  := public.is_admin();

  if v_seller then
    ok := ok
      or (e.status = 'submitted' and _new_status in ('viewed', 'responding', 'rejected'))
      or (e.status = 'viewed' and _new_status in ('responding', 'rejected'))
      or (e.status = 'responding' and _new_status = 'rejected')
      or (e.status in ('quoted', 'accepted', 'rejected') and _new_status = 'closed');
  end if;
  if v_buyer then
    ok := ok
      or (e.status in ('submitted', 'viewed', 'responding', 'quoted') and _new_status = 'cancelled')
      or (e.status in ('accepted', 'rejected') and _new_status = 'closed');
  end if;
  if v_admin then
    ok := ok or (e.status not in ('closed', 'cancelled') and _new_status in ('closed', 'cancelled'));
  end if;
  if not ok then
    raise exception 'transition % -> % is not allowed', e.status, _new_status using errcode = '42501';
  end if;
  perform public._set_enquiry_status(_enquiry_id, _new_status, auth.uid(), _notes);
end;
$$;

-- Quotation guard for direct client writes (service role/definer functions bypass).
create or replace function public.quotations_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_items numeric;
  v_count integer;
  v_seller boolean;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'quotations start as draft' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.enquiry_id <> old.enquiry_id or new.seller_id <> old.seller_id
     or new.buyer_id <> old.buyer_id or new.quote_number <> old.quote_number then
    raise exception 'protected quotation fields cannot be changed' using errcode = '42501';
  end if;

  v_seller := public.is_seller_owner(old.seller_id);

  if v_seller then
    if old.status = 'draft' then
      if new.status not in ('draft', 'sent', 'cancelled') then
        raise exception 'invalid status change' using errcode = '42501';
      end if;
      if new.status = 'sent' then
        select count(*), coalesce(sum(total_price), 0) into v_count, v_items
          from public.quotation_items where quotation_id = old.id;
        if v_count = 0 or v_items <> new.subtotal then
          raise exception 'quotation items must exist and add up to the subtotal' using errcode = '23514';
        end if;
      end if;
    elsif old.status in ('sent', 'viewed') then
      if new.status not in ('revised', 'cancelled')
         or new.subtotal <> old.subtotal or new.tax_amount <> old.tax_amount
         or new.shipping_charges <> old.shipping_charges or new.discount_amount <> old.discount_amount
         or new.total_amount <> old.total_amount or new.currency <> old.currency
         or new.valid_until is distinct from old.valid_until or new.terms is distinct from old.terms then
        raise exception 'a sent quotation can only be revised or cancelled' using errcode = '42501';
      end if;
    else
      raise exception 'quotation is final' using errcode = '42501';
    end if;
  elsif old.buyer_id = auth.uid() then
    if new.subtotal <> old.subtotal or new.tax_amount <> old.tax_amount
       or new.shipping_charges <> old.shipping_charges or new.discount_amount <> old.discount_amount
       or new.total_amount <> old.total_amount or new.currency <> old.currency
       or new.valid_until is distinct from old.valid_until or new.terms is distinct from old.terms then
      raise exception 'buyers cannot edit quotation terms' using errcode = '42501';
    end if;
    if not ((old.status = 'sent' and new.status in ('viewed', 'accepted', 'rejected'))
         or (old.status = 'viewed' and new.status in ('accepted', 'rejected'))) then
      raise exception 'invalid status change' using errcode = '42501';
    end if;
    if new.status = 'accepted' and old.valid_until is not null and old.valid_until < now() then
      raise exception 'quotation has expired' using errcode = '22023';
    end if;
  else
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger quotations_guard_trg before insert or update on public.quotations
  for each row execute function public.quotations_guard();

-- Keep the enquiry in sync with quotation lifecycle events.
create or replace function public.quotations_after_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'sent' then
      perform public._set_enquiry_status(new.enquiry_id, 'quoted', auth.uid(), 'Quotation ' || new.quote_number || ' sent');
    elsif new.status = 'accepted' then
      perform public._set_enquiry_status(new.enquiry_id, 'accepted', auth.uid(), 'Quotation ' || new.quote_number || ' accepted');
    elsif new.status = 'rejected' then
      -- Negotiation continues: the seller may issue a new quotation.
      perform public._set_enquiry_status(new.enquiry_id, 'responding', auth.uid(), 'Quotation ' || new.quote_number || ' rejected by buyer');
    end if;
  end if;
  return null;
end;
$$;
create trigger quotations_after_change_trg after update on public.quotations
  for each row execute function public.quotations_after_change();

-- --------------------------------------------------------- privileges + RLS ---
alter table public.enquiries enable row level security;
alter table public.enquiry_status_history enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
revoke all on table public.enquiries from public, anon, authenticated;
revoke all on table public.enquiry_status_history from public, anon, authenticated;
revoke all on table public.quotations from public, anon, authenticated;
revoke all on table public.quotation_items from public, anon, authenticated;
revoke all on sequence public.quotation_number_seq from public, anon, authenticated;
grant usage on sequence public.quotation_number_seq to authenticated;

grant select on public.enquiries to authenticated;
grant insert (buyer_id, seller_id, product_id, enquiry_title, description, quantity, unit,
              expected_budget, currency, delivery_location, required_delivery_date, client_request_id)
  on public.enquiries to authenticated;
create policy enquiries_select_buyer on public.enquiries
  for select to authenticated using (buyer_id = auth.uid());
create policy enquiries_select_seller on public.enquiries
  for select to authenticated using (public.is_seller_owner(seller_id));
create policy enquiries_select_admin on public.enquiries
  for select to authenticated using (public.is_admin());
create policy enquiries_insert_buyer on public.enquiries
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and public.current_account_active()
    and status = 'submitted'
    and public.is_seller_verified(seller_id)
    and not public.is_seller_owner(seller_id)
    and (product_id is null or public.product_matches_seller(product_id, seller_id))
  );

grant select on public.enquiry_status_history to authenticated;
create policy enquiry_history_select on public.enquiry_status_history
  for select to authenticated using (public.can_access_enquiry(enquiry_id));

grant select on public.quotations to authenticated;
grant insert (enquiry_id, seller_id, buyer_id, subtotal, tax_amount, shipping_charges, discount_amount,
              total_amount, currency, valid_until, terms)
  on public.quotations to authenticated;
grant update (subtotal, tax_amount, shipping_charges, discount_amount, total_amount, currency,
              valid_until, terms, status)
  on public.quotations to authenticated;
create policy quotations_select on public.quotations
  for select to authenticated
  using (public.is_seller_owner(seller_id) or (buyer_id = auth.uid() and status <> 'draft') or public.is_admin());
create policy quotations_insert_seller on public.quotations
  for insert to authenticated
  with check (public.is_seller_owner(seller_id) and public.can_quote_enquiry(enquiry_id, seller_id, buyer_id));
create policy quotations_update on public.quotations
  for update to authenticated
  using (public.is_seller_owner(seller_id) or (buyer_id = auth.uid() and status in ('sent', 'viewed')))
  with check (public.is_seller_owner(seller_id) or buyer_id = auth.uid());

grant select, insert, update, delete on public.quotation_items to authenticated;
create policy quotation_items_select on public.quotation_items
  for select to authenticated using (public.can_view_quotation(quotation_id));
create policy quotation_items_insert on public.quotation_items
  for insert to authenticated with check (public.is_draft_quotation_owner(quotation_id));
create policy quotation_items_update on public.quotation_items
  for update to authenticated
  using (public.is_draft_quotation_owner(quotation_id))
  with check (public.is_draft_quotation_owner(quotation_id));
create policy quotation_items_delete on public.quotation_items
  for delete to authenticated using (public.is_draft_quotation_owner(quotation_id));

-- ---------------------------------------------------------- function privileges ---
revoke all on function public.can_access_enquiry(uuid) from public, anon, authenticated;
revoke all on function public.product_matches_seller(uuid, uuid) from public, anon, authenticated;
revoke all on function public.seller_can_see_buyer(uuid) from public, anon, authenticated;
revoke all on function public.can_quote_enquiry(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.can_view_quotation(uuid) from public, anon, authenticated;
revoke all on function public.is_draft_quotation_owner(uuid) from public, anon, authenticated;
revoke all on function public._set_enquiry_status(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.enquiries_after_insert() from public, anon, authenticated;
revoke all on function public.transition_enquiry_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.quotations_guard() from public, anon, authenticated;
revoke all on function public.quotations_after_change() from public, anon, authenticated;
grant execute on function public.can_access_enquiry(uuid) to authenticated;
grant execute on function public.product_matches_seller(uuid, uuid) to authenticated;
grant execute on function public.seller_can_see_buyer(uuid) to authenticated;
grant execute on function public.can_quote_enquiry(uuid, uuid, uuid) to authenticated;
grant execute on function public.can_view_quotation(uuid) to authenticated;
grant execute on function public.is_draft_quotation_owner(uuid) to authenticated;
grant execute on function public.transition_enquiry_status(uuid, text, text) to authenticated;

comment on function public._set_enquiry_status(uuid, text, uuid, text) is
  'INTERNAL SECURITY DEFINER. No authorization; EXECUTE revoked from all client roles. Called by trusted functions/triggers.';

