-- =============================================================================
-- Migration 7: buyer-seller conversations, real-time messages, private chat
--              attachments bucket, and transactional notification triggers
--
-- Security model summary
--   * Strict RLS on public.conversations and public.messages (default-deny).
--   * Clients have NO direct INSERT/UPDATE/DELETE grants on conversations;
--     threads are created/deduplicated via get_or_create_conversation(), and
--     read/archive state moves only via mark_conversation_read() and
--     set_conversation_archived().
--   * Messages are append-only (prevent_mutation() blocks UPDATE/DELETE) and
--     enforce participant role matching + per-user rate limiting in PostgreSQL.
--   * Private bucket 'message-attachments' enforces <conversation_id>/<file>
--     path isolation via can_access_conversation(storage_first_folder_uuid(name)).
--   * Event-driven notifications reuse public.notifications via internal
--     SECURITY DEFINER helper _emit_notification() (EXECUTE revoked from clients).
-- =============================================================================

-- ----------------------------------------------------------- conversations ---
create table if not exists public.conversations (
  id                     uuid primary key default gen_random_uuid(),
  buyer_id               uuid not null references public.profiles (id) on delete restrict,
  seller_id              uuid not null references public.seller_profiles (id) on delete restrict,
  enquiry_id             uuid references public.enquiries (id) on delete restrict,
  product_id             uuid references public.products (id) on delete restrict,
  subject                text not null check (char_length(trim(subject)) between 1 and 200),
  last_message_id        uuid,
  last_message_preview   text check (last_message_preview is null or char_length(last_message_preview) <= 300),
  last_message_sender_id uuid references public.profiles (id) on delete restrict,
  last_message_at        timestamptz not null default now(),
  buyer_last_read_at     timestamptz,
  seller_last_read_at    timestamptz,
  buyer_unread_count     integer not null default 0 check (buyer_unread_count >= 0),
  seller_unread_count    integer not null default 0 check (seller_unread_count >= 0),
  buyer_archived_at      timestamptz,
  seller_archived_at     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Canonical thread deduplication by commercial context
create unique index if not exists conversations_unique_enquiry_idx
  on public.conversations (enquiry_id)
  where enquiry_id is not null;

create unique index if not exists conversations_unique_product_idx
  on public.conversations (buyer_id, seller_id, product_id)
  where enquiry_id is null and product_id is not null;

create unique index if not exists conversations_unique_general_idx
  on public.conversations (buyer_id, seller_id)
  where enquiry_id is null and product_id is null;

-- Inbox sorting and unread badge indexes
create index if not exists conversations_buyer_inbox_idx
  on public.conversations (buyer_id, last_message_at desc);

create index if not exists conversations_seller_inbox_idx
  on public.conversations (seller_id, last_message_at desc);

create index if not exists conversations_buyer_unread_idx
  on public.conversations (buyer_id)
  where buyer_unread_count > 0 and buyer_archived_at is null;

create index if not exists conversations_seller_unread_idx
  on public.conversations (seller_id)
  where seller_unread_count > 0 and seller_archived_at is null;

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- messages ---
create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations (id) on delete restrict,
  sender_id         uuid not null references public.profiles (id) on delete restrict,
  sender_role       text not null check (sender_role in ('buyer', 'seller')),
  message_type      text not null default 'text' check (message_type in ('text', 'attachment', 'system')),
  body              text not null default '' check (char_length(body) <= 4000),
  attachment_path   text check (attachment_path is null or attachment_path like conversation_id::text || '/%'),
  attachment_name   text check (attachment_name is null or char_length(attachment_name) between 1 and 255),
  attachment_mime   text check (attachment_mime is null or attachment_mime in (
                      'application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  attachment_size   integer check (attachment_size is null or (attachment_size > 0 and attachment_size <= 10485760)),
  client_message_id uuid,
  created_at        timestamptz not null default now(),
  constraint messages_content_or_attachment_chk check (
    char_length(trim(body)) > 0 or attachment_path is not null
  ),
  constraint messages_attachment_completeness_chk check (
    (attachment_path is null and attachment_name is null and attachment_mime is null and attachment_size is null)
    or (attachment_path is not null and attachment_name is not null and attachment_mime is not null and attachment_size is not null)
  ),
  constraint messages_idempotency_key unique (conversation_id, sender_id, client_message_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversations_last_message_fk'
  ) then
    alter table public.conversations
      add constraint conversations_last_message_fk
      foreign key (last_message_id) references public.messages (id) on delete restrict;
  end if;
end;
$$;

create index if not exists messages_conversation_cursor_idx
  on public.messages (conversation_id, created_at desc, id desc);

create index if not exists messages_sender_rate_idx
  on public.messages (sender_id, created_at desc);

drop trigger if exists messages_immutable on public.messages;
create trigger messages_immutable before update or delete on public.messages
  for each row execute function public.prevent_mutation();

-- ------------------------------------------- buyer visibility & auth helpers ---
-- Extend seller_can_see_buyer so sellers can also view buyer profiles in direct
-- conversations started prior to a formal enquiry.
create or replace function public.seller_can_see_buyer(_buyer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enquiries e
    where e.buyer_id = _buyer_id and public.is_seller_owner(e.seller_id)
  ) or exists (
    select 1 from public.conversations c
    where c.buyer_id = _buyer_id and public.is_seller_owner(c.seller_id)
  );
$$;

create or replace function public.can_access_conversation(_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_account_active() and exists (
    select 1 from public.conversations c
    where c.id = _conversation_id
      and (c.buyer_id = auth.uid() or public.is_seller_owner(c.seller_id) or public.is_admin())
  );
$$;

-- Internal helper: insert a notification row with short-window deduplication.
-- EXECUTE is revoked from all client roles; only trusted triggers/RPCs call it.
create or replace function public._emit_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text,
  _reference_id uuid default null,
  _dedupe_seconds integer default 5
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_clean_title text := left(coalesce(nullif(trim(_title), ''), 'Notification'), 200);
  v_clean_msg   text := left(coalesce(trim(_message), ''), 2000);
begin
  if _user_id is null then
    return;
  end if;

  if coalesce(_dedupe_seconds, 0) > 0 and exists (
    select 1 from public.notifications n
    where n.user_id = _user_id
      and n.notification_type = _type
      and n.reference_id is not distinct from _reference_id
      and n.title = v_clean_title
      and n.created_at >= now() - make_interval(secs => _dedupe_seconds)
  ) then
    return;
  end if;

  insert into public.notifications (user_id, title, message, notification_type, reference_id)
  values (_user_id, v_clean_title, v_clean_msg, _type, _reference_id);
end;
$$;

-- ------------------------------------------- conversation lifecycle RPCs ---
create or replace function public.get_or_create_conversation(
  _seller_id uuid,
  _enquiry_id uuid default null,
  _product_id uuid default null,
  _subject text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid         uuid := auth.uid();
  v_conv_id     uuid;
  v_buyer_id    uuid;
  v_seller_id   uuid;
  v_product_id  uuid;
  v_subject     text := nullif(trim(coalesce(_subject, '')), '');
  v_recent_new  integer;
  v_enq         public.enquiries;
  v_prod_name   text;
  v_seller_name text;
begin
  if v_uid is null or not public.current_account_active() then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if _enquiry_id is not null then
    select * into v_enq from public.enquiries where id = _enquiry_id;
    if not found then
      raise exception 'enquiry not found' using errcode = 'P0002';
    end if;

    if v_enq.buyer_id <> v_uid and not public.is_seller_owner(v_enq.seller_id) then
      raise exception 'not authorized for this enquiry' using errcode = '42501';
    end if;

    if _seller_id is not null and _seller_id <> v_enq.seller_id then
      raise exception 'seller does not match enquiry' using errcode = '22023';
    end if;

    if _product_id is not null and v_enq.product_id is not null and _product_id <> v_enq.product_id then
      raise exception 'product does not match enquiry' using errcode = '22023';
    end if;

    select c.id into v_conv_id
    from public.conversations c
    where c.enquiry_id = _enquiry_id;

    if v_conv_id is not null then
      return v_conv_id;
    end if;

    v_buyer_id   := v_enq.buyer_id;
    v_seller_id  := v_enq.seller_id;
    v_product_id := coalesce(v_enq.product_id, _product_id);
    v_subject    := left(coalesce(v_subject, 'Enquiry: ' || v_enq.enquiry_title), 200);
  else
    if not public.has_role('buyer') then
      raise exception 'buyer capability required' using errcode = '42501';
    end if;

    if _seller_id is null then
      raise exception 'seller_id is required' using errcode = '22023';
    end if;

    if public.is_seller_owner(_seller_id) then
      raise exception 'cannot message your own seller business' using errcode = '42501';
    end if;

    if _product_id is not null then
      select c.id into v_conv_id
      from public.conversations c
      where c.buyer_id = v_uid
        and c.seller_id = _seller_id
        and c.enquiry_id is null
        and c.product_id = _product_id;
    else
      select c.id into v_conv_id
      from public.conversations c
      where c.buyer_id = v_uid
        and c.seller_id = _seller_id
        and c.enquiry_id is null
        and c.product_id is null;
    end if;

    if v_conv_id is not null then
      return v_conv_id;
    end if;

    if not public.is_seller_verified(_seller_id) then
      raise exception 'seller is not verified' using errcode = '42501';
    end if;

    if _product_id is not null and not public.product_matches_seller(_product_id, _seller_id) then
      raise exception 'product is not available for this seller' using errcode = '42501';
    end if;

    select count(*) into v_recent_new
    from public.conversations c
    where c.buyer_id = v_uid
      and c.created_at >= now() - interval '60 seconds';

    if v_recent_new >= 10 then
      raise exception 'conversation creation rate limit exceeded' using errcode = '42501';
    end if;

    if v_subject is null then
      if _product_id is not null then
        select p.name into v_prod_name from public.products p where p.id = _product_id;
        v_subject := 'Product Inquiry: ' || coalesce(v_prod_name, 'Stone Specification');
      else
        select s.business_name into v_seller_name from public.seller_profiles s where s.id = _seller_id;
        v_subject := 'Trade Discussion: ' || coalesce(v_seller_name, 'Supplier');
      end if;
    end if;

    v_buyer_id   := v_uid;
    v_seller_id  := _seller_id;
    v_product_id := _product_id;
    v_subject    := left(v_subject, 200);
  end if;

  insert into public.conversations (
    buyer_id, seller_id, enquiry_id, product_id, subject,
    buyer_last_read_at, seller_last_read_at
  )
  values (
    v_buyer_id,
    v_seller_id,
    _enquiry_id,
    v_product_id,
    v_subject,
    case when v_uid = v_buyer_id then now() else null end,
    case when v_uid <> v_buyer_id then now() else null end
  )
  on conflict do nothing
  returning id into v_conv_id;

  if v_conv_id is null then
    if _enquiry_id is not null then
      select c.id into v_conv_id from public.conversations c where c.enquiry_id = _enquiry_id;
    elsif v_product_id is not null then
      select c.id into v_conv_id
      from public.conversations c
      where c.buyer_id = v_buyer_id
        and c.seller_id = v_seller_id
        and c.enquiry_id is null
        and c.product_id = v_product_id;
    else
      select c.id into v_conv_id
      from public.conversations c
      where c.buyer_id = v_buyer_id
        and c.seller_id = v_seller_id
        and c.enquiry_id is null
        and c.product_id is null;
    end if;
  end if;

  return v_conv_id;
end;
$$;

create or replace function public.mark_conversation_read(_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c           public.conversations;
  v_is_buyer  boolean;
  v_is_seller boolean;
begin
  if auth.uid() is null or not public.current_account_active() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into c from public.conversations where id = _conversation_id for update;
  if not found then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;

  v_is_buyer  := (c.buyer_id = auth.uid());
  v_is_seller := public.is_seller_owner(c.seller_id);

  if not v_is_buyer and not v_is_seller then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if v_is_buyer then
    update public.conversations
       set buyer_unread_count = 0,
           buyer_last_read_at = now()
     where id = _conversation_id;
  end if;

  if v_is_seller then
    update public.conversations
       set seller_unread_count = 0,
           seller_last_read_at = now()
     where id = _conversation_id;
  end if;

  update public.notifications
     set is_read = true
   where user_id = auth.uid()
     and notification_type = 'message_received'
     and reference_id = _conversation_id
     and is_read = false;
end;
$$;

create or replace function public.set_conversation_archived(_conversation_id uuid, _archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  c           public.conversations;
  v_is_buyer  boolean;
  v_is_seller boolean;
begin
  if auth.uid() is null or not public.current_account_active() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select * into c from public.conversations where id = _conversation_id for update;
  if not found then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;

  v_is_buyer  := (c.buyer_id = auth.uid());
  v_is_seller := public.is_seller_owner(c.seller_id);

  if not v_is_buyer and not v_is_seller then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if v_is_buyer then
    update public.conversations
       set buyer_archived_at = case when coalesce(_archived, false) then now() else null end
     where id = _conversation_id;
  end if;

  if v_is_seller then
    update public.conversations
       set seller_archived_at = case when coalesce(_archived, false) then now() else null end
     where id = _conversation_id;
  end if;
end;
$$;

-- ------------------------------------------- message guard & sync triggers ---
create or replace function public.messages_before_insert_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c              public.conversations;
  v_recent_count integer;
begin
  select * into c from public.conversations where id = new.conversation_id for update;
  if not found then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;

  if auth.uid() is not null then
    if not public.current_account_active() then
      raise exception 'not authorized' using errcode = '42501';
    end if;

    if new.sender_id <> auth.uid() then
      raise exception 'sender_id must match authenticated user' using errcode = '42501';
    end if;

    if new.message_type = 'system' then
      raise exception 'clients cannot insert system messages' using errcode = '42501';
    end if;

    if new.sender_role = 'buyer' then
      if c.buyer_id <> auth.uid() then
        raise exception 'not authorized as buyer in this conversation' using errcode = '42501';
      end if;
    elsif new.sender_role = 'seller' then
      if not public.is_seller_owner(c.seller_id) then
        raise exception 'not authorized as seller in this conversation' using errcode = '42501';
      end if;
    else
      raise exception 'invalid sender_role' using errcode = '22023';
    end if;

    select count(*) into v_recent_count
    from public.messages m
    where m.sender_id = auth.uid()
      and m.created_at >= now() - interval '60 seconds';

    if v_recent_count >= 25 then
      raise exception 'message rate limit exceeded' using errcode = '42501';
    end if;
  end if;

  new.body := trim(coalesce(new.body, ''));
  if new.message_type <> 'system' then
    new.message_type := case when new.attachment_path is not null then 'attachment' else 'text' end;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_before_insert_guard_trg on public.messages;
create trigger messages_before_insert_guard_trg before insert on public.messages
  for each row execute function public.messages_before_insert_guard();

create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c                public.conversations;
  v_preview        text;
  v_recipient_id   uuid;
  v_sender_display text;
begin
  select * into c from public.conversations where id = new.conversation_id;
  if not found then
    return null;
  end if;

  if char_length(trim(new.body)) > 0 then
    v_preview := left(regexp_replace(trim(new.body), '\s+', ' ', 'g'), 240);
  else
    v_preview := left('Attachment: ' || coalesce(new.attachment_name, 'Document'), 240);
  end if;

  update public.conversations
     set last_message_id        = new.id,
         last_message_preview   = v_preview,
         last_message_sender_id = new.sender_id,
         last_message_at        = new.created_at,
         buyer_archived_at      = null,
         seller_archived_at     = null,
         buyer_last_read_at     = case
                                    when new.sender_role = 'buyer'
                                    then greatest(coalesce(buyer_last_read_at, new.created_at), new.created_at)
                                    else buyer_last_read_at
                                  end,
         seller_last_read_at    = case
                                    when new.sender_role = 'seller'
                                    then greatest(coalesce(seller_last_read_at, new.created_at), new.created_at)
                                    else seller_last_read_at
                                  end,
         buyer_unread_count     = case
                                    when new.sender_role = 'seller' then buyer_unread_count + 1
                                    else buyer_unread_count
                                  end,
         seller_unread_count    = case
                                    when new.sender_role = 'buyer' then seller_unread_count + 1
                                    else seller_unread_count
                                  end
   where id = new.conversation_id;

  if new.sender_role = 'buyer' then
    select s.user_id into v_recipient_id
    from public.seller_profiles s
    where s.id = c.seller_id;

    select coalesce(nullif(trim(p.full_name), ''), 'A buyer') into v_sender_display
    from public.profiles p
    where p.id = new.sender_id;
  else
    v_recipient_id := c.buyer_id;

    select coalesce(s.business_name, 'Supplier') into v_sender_display
    from public.seller_profiles s
    where s.id = c.seller_id;
  end if;

  if v_recipient_id is not null and v_recipient_id <> new.sender_id then
    perform public._emit_notification(
      v_recipient_id,
      'New message from ' || left(coalesce(v_sender_display, 'Participant'), 150),
      v_preview,
      'message_received',
      new.conversation_id,
      1
    );
  end if;

  return null;
end;
$$;

drop trigger if exists messages_after_insert_trg on public.messages;
create trigger messages_after_insert_trg after insert on public.messages
  for each row execute function public.messages_after_insert();

-- ------------------------------------ transactional notification triggers ---
-- 1. New Enquiry submitted -> notify Seller ('enquiry_received') + Buyer confirmation ('system')
create or replace function public.notify_on_enquiry_created()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_seller_user_id uuid;
  v_seller_name    text;
  v_buyer_name     text;
  v_qty_text       text;
begin
  select s.user_id, s.business_name into v_seller_user_id, v_seller_name
  from public.seller_profiles s
  where s.id = new.seller_id;

  select coalesce(nullif(trim(p.full_name), ''), 'A buyer') into v_buyer_name
  from public.profiles p
  where p.id = new.buyer_id;

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

  perform public._emit_notification(
    new.buyer_id,
    'Enquiry Sent: ' || left(new.enquiry_title, 160),
    'Your requirement for ' || v_qty_text || ' has been submitted to ' || coalesce(v_seller_name, 'the supplier') || '.',
    'system',
    new.id,
    5
  );

  return null;
end;
$$;

drop trigger if exists enquiries_notify_insert_trg on public.enquiries;
create trigger enquiries_notify_insert_trg after insert on public.enquiries
  for each row execute function public.notify_on_enquiry_created();

-- 2. Enquiry status history transitions -> notify counterparty (excluding initial 'submitted' and quotation-driven transitions)
create or replace function public.notify_on_enquiry_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  e                public.enquiries;
  v_seller_user_id uuid;
  v_seller_name    text;
  v_buyer_name     text;
begin
  -- Initial submission and quotation-driven transitions emit dedicated notifications
  if new.previous_status is null
     or new.new_status in ('submitted', 'quoted', 'accepted')
     or coalesce(new.notes, '') like 'Quotation QT-%' then
    return null;
  end if;

  select * into e from public.enquiries where id = new.enquiry_id;
  if not found then
    return null;
  end if;

  select s.user_id, s.business_name into v_seller_user_id, v_seller_name
  from public.seller_profiles s
  where s.id = e.seller_id;

  select coalesce(nullif(trim(p.full_name), ''), 'The buyer') into v_buyer_name
  from public.profiles p
  where p.id = e.buyer_id;

  if new.new_status in ('viewed', 'responding') then
    perform public._emit_notification(
      e.buyer_id,
      'Supplier Reviewing Enquiry: ' || left(e.enquiry_title, 150),
      coalesce(v_seller_name, 'Supplier') || ' marked your enquiry as ' || replace(new.new_status, '_', ' ') || '.',
      'enquiry_viewed',
      e.id,
      5
    );
  elsif new.new_status = 'rejected' then
    perform public._emit_notification(
      e.buyer_id,
      'Enquiry Declined: ' || left(e.enquiry_title, 150),
      coalesce(v_seller_name, 'Supplier') || ' declined this enquiry.' ||
        case when nullif(trim(coalesce(new.notes, '')), '') is not null then ' Note: ' || left(trim(new.notes), 240) else '' end,
      'system',
      e.id,
      5
    );
  elsif new.new_status = 'cancelled' then
    if v_seller_user_id is not null and (new.changed_by is null or new.changed_by <> v_seller_user_id) then
      perform public._emit_notification(
        v_seller_user_id,
        'Enquiry Cancelled: ' || left(e.enquiry_title, 150),
        v_buyer_name || ' cancelled the enquiry.',
        'system',
        e.id,
        5
      );
    end if;
    if new.changed_by is not null and new.changed_by <> e.buyer_id then
      perform public._emit_notification(
        e.buyer_id,
        'Enquiry Cancelled: ' || left(e.enquiry_title, 150),
        'Your enquiry was cancelled.',
        'system',
        e.id,
        5
      );
    end if;
  elsif new.new_status = 'closed' then
    if new.changed_by is distinct from e.buyer_id then
      perform public._emit_notification(
        e.buyer_id,
        'Enquiry Closed: ' || left(e.enquiry_title, 150),
        'Enquiry "' || left(e.enquiry_title, 120) || '" has been marked closed.',
        'system',
        e.id,
        5
      );
    end if;
    if v_seller_user_id is not null and new.changed_by is distinct from v_seller_user_id then
      perform public._emit_notification(
        v_seller_user_id,
        'Enquiry Closed: ' || left(e.enquiry_title, 150),
        'Enquiry "' || left(e.enquiry_title, 120) || '" has been marked closed.',
        'system',
        e.id,
        5
      );
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists enquiry_history_notify_trg on public.enquiry_status_history;
create trigger enquiry_history_notify_trg after insert on public.enquiry_status_history
  for each row execute function public.notify_on_enquiry_status_change();

-- 3. Quotation sent / accepted / rejected -> notify recipient & counterparty
create or replace function public.notify_on_quotation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_seller_user_id uuid;
  v_seller_name    text;
  v_buyer_name     text;
  v_enquiry_title  text;
  v_amount_text    text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  select s.user_id, s.business_name into v_seller_user_id, v_seller_name
  from public.seller_profiles s
  where s.id = new.seller_id;

  select coalesce(nullif(trim(p.full_name), ''), 'Buyer') into v_buyer_name
  from public.profiles p
  where p.id = new.buyer_id;

  select e.enquiry_title into v_enquiry_title
  from public.enquiries e
  where e.id = new.enquiry_id;

  v_amount_text := new.currency || ' ' || trim(to_char(new.total_amount, 'FM999999999990.00'));

  if new.status = 'sent' then
    perform public._emit_notification(
      new.buyer_id,
      'Quotation ' || new.quote_number || ' Received',
      coalesce(v_seller_name, 'Supplier') || ' sent quotation ' || new.quote_number ||
        ' (' || v_amount_text || ') for "' || left(coalesce(v_enquiry_title, 'your enquiry'), 100) || '".',
      'quotation_received',
      new.id,
      5
    );
  elsif new.status = 'accepted' and v_seller_user_id is not null then
    perform public._emit_notification(
      v_seller_user_id,
      'Quotation ' || new.quote_number || ' Accepted',
      v_buyer_name || ' accepted quotation ' || new.quote_number || ' (' || v_amount_text || ').',
      'quotation_accepted',
      new.id,
      5
    );
  elsif new.status = 'rejected' and v_seller_user_id is not null then
    perform public._emit_notification(
      v_seller_user_id,
      'Quotation ' || new.quote_number || ' Declined',
      v_buyer_name || ' declined quotation ' || new.quote_number || '. You may message the buyer or issue a revised quotation.',
      'quotation_rejected',
      new.id,
      5
    );
  end if;

  return null;
end;
$$;

drop trigger if exists quotations_notify_update_trg on public.quotations;
create trigger quotations_notify_update_trg after update on public.quotations
  for each row execute function public.notify_on_quotation_change();

-- 4. Seller verification status updates -> notify seller owner
create or replace function public.notify_on_seller_verification_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verification_status is not distinct from old.verification_status then
    return null;
  end if;

  if new.verification_status in ('under_review', 'verified', 'rejected', 'suspended') then
    perform public._emit_notification(
      new.user_id,
      case new.verification_status
        when 'verified' then 'Seller Business Verified'
        when 'under_review' then 'Verification Under Review'
        when 'rejected' then 'Verification Requires Changes'
        else 'Seller Account Suspended'
      end,
      case new.verification_status
        when 'verified' then 'Congratulations! ' || new.business_name || ' is now a verified supplier on StoneB2B.'
        when 'under_review' then 'Our compliance team has started reviewing ' || new.business_name || '.'
        else coalesce('Reason: ' || nullif(trim(coalesce(new.verification_reason, '')), ''), 'Please review your verification details.')
      end,
      'seller_verification',
      new.id,
      5
    );
  end if;

  return null;
end;
$$;

drop trigger if exists seller_profiles_notify_verification_trg on public.seller_profiles;
create trigger seller_profiles_notify_verification_trg after update on public.seller_profiles
  for each row execute function public.notify_on_seller_verification_change();

-- 5. Product moderation status updates -> notify owning seller
create or replace function public.notify_on_product_moderation_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_seller_user_id uuid;
begin
  if new.moderation_status is not distinct from old.moderation_status then
    return null;
  end if;

  if new.moderation_status in ('approved', 'rejected', 'archived') then
    select s.user_id into v_seller_user_id
    from public.seller_profiles s
    where s.id = new.seller_id;

    if v_seller_user_id is not null then
      perform public._emit_notification(
        v_seller_user_id,
        case new.moderation_status
          when 'approved' then 'Product Approved: ' || left(new.name, 150)
          when 'rejected' then 'Product Needs Changes: ' || left(new.name, 150)
          else 'Product Archived: ' || left(new.name, 150)
        end,
        case new.moderation_status
          when 'approved' then '"' || left(new.name, 140) || '" is now published on the public StoneB2B catalogue.'
          else coalesce('Reason: ' || nullif(trim(coalesce(new.rejection_reason, '')), ''), 'Status updated to ' || new.moderation_status || '.')
        end,
        'product_moderation',
        new.id,
        5
      );
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists products_notify_moderation_trg on public.products;
create trigger products_notify_moderation_trg after update on public.products
  for each row execute function public.notify_on_product_moderation_change();

-- 6. Account status updates -> notify affected user
create or replace function public.notify_on_account_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.account_status is not distinct from old.account_status then
    return null;
  end if;

  perform public._emit_notification(
    new.id,
    'Account Status Updated: ' || initcap(new.account_status),
    case new.account_status
      when 'active' then 'Your StoneB2B account is now active.'
      when 'suspended' then 'Your StoneB2B account has been suspended. Please contact platform support.'
      else 'Your account status is now ' || new.account_status || '.'
    end,
    'account_status',
    new.id,
    5
  );

  return null;
end;
$$;

drop trigger if exists profiles_notify_account_status_trg on public.profiles;
create trigger profiles_notify_account_status_trg after update of account_status on public.profiles
  for each row execute function public.notify_on_account_status_change();

-- --------------------------------------------------------- privileges + RLS ---
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

revoke all on table public.conversations from public, anon, authenticated;
revoke all on table public.messages      from public, anon, authenticated;

grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;
grant insert (
  conversation_id, sender_id, sender_role, message_type, body,
  attachment_path, attachment_name, attachment_mime, attachment_size, client_message_id
) on public.messages to authenticated;

drop policy if exists conversations_select_buyer on public.conversations;
create policy conversations_select_buyer on public.conversations
  for select to authenticated
  using (buyer_id = auth.uid() and public.current_account_active());

drop policy if exists conversations_select_seller on public.conversations;
create policy conversations_select_seller on public.conversations
  for select to authenticated
  using (public.is_seller_owner(seller_id));

drop policy if exists conversations_select_admin on public.conversations;
create policy conversations_select_admin on public.conversations
  for select to authenticated
  using (public.is_admin());

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages
  for select to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists messages_insert_participant on public.messages;
create policy messages_insert_participant on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.current_account_active()
    and public.can_access_conversation(conversation_id)
  );

-- ------------------------------------------- private chat attachments bucket ---
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('message-attachments', 'message-attachments', false, 10485760,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "message attachments: participants select" on storage.objects;
create policy "message attachments: participants select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'message-attachments'
    and public.can_access_conversation(public.storage_first_folder_uuid(name))
  );

drop policy if exists "message attachments: participants insert" on storage.objects;
create policy "message attachments: participants insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'message-attachments'
    and public.can_access_conversation(public.storage_first_folder_uuid(name))
    and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
  );
-- No UPDATE/DELETE policy on message-attachments: commercial chat evidence is immutable.

-- ------------------------------------------------------ function privileges ---
revoke all on function public.seller_can_see_buyer(uuid) from public, anon, authenticated;
revoke all on function public.can_access_conversation(uuid) from public, anon, authenticated;
revoke all on function public._emit_notification(uuid, text, text, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.get_or_create_conversation(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.mark_conversation_read(uuid) from public, anon, authenticated;
revoke all on function public.set_conversation_archived(uuid, boolean) from public, anon, authenticated;
revoke all on function public.messages_before_insert_guard() from public, anon, authenticated;
revoke all on function public.messages_after_insert() from public, anon, authenticated;
revoke all on function public.notify_on_enquiry_created() from public, anon, authenticated;
revoke all on function public.notify_on_enquiry_status_change() from public, anon, authenticated;
revoke all on function public.notify_on_quotation_change() from public, anon, authenticated;
revoke all on function public.notify_on_seller_verification_change() from public, anon, authenticated;
revoke all on function public.notify_on_product_moderation_change() from public, anon, authenticated;
revoke all on function public.notify_on_account_status_change() from public, anon, authenticated;

grant execute on function public.seller_can_see_buyer(uuid) to authenticated;
grant execute on function public.can_access_conversation(uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.set_conversation_archived(uuid, boolean) to authenticated;

comment on function public._emit_notification(uuid, text, text, text, uuid, integer) is
  'INTERNAL SECURITY DEFINER. EXECUTE revoked from all client roles. Emits deduplicated rows into public.notifications.';

-- ---------------------------------------------- Supabase Realtime publication ---
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
    ) then
      alter publication supabase_realtime add table public.conversations;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end;
$$;
