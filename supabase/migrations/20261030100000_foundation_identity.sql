-- =============================================================================
-- Migration 1: foundation + identity (profiles, user_roles, admin_audit_logs)
--
-- Security model summary
--   * RLS is enabled on every table. Table privileges are revoked from
--     anon/authenticated first, then granted back minimally (column-level for
--     UPDATE/INSERT where users must not touch privileged columns).
--   * Roles live in public.user_roles and can only be changed by the
--     SECURITY DEFINER functions below (or the service role). Clients cannot
--     write to user_roles at all.
--   * Every SECURITY DEFINER function sets search_path = '' and has EXECUTE
--     revoked from PUBLIC/anon/authenticated, then granted back explicitly.
-- =============================================================================

-- ---------------------------------------------------------------- helpers ---
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Generic guard that makes a table append-only (audit trails, histories).
create or replace function public.prevent_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

-- --------------------------------------------------------------- profiles ---
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  email          text,
  phone          text,
  avatar_url     text,
  country        text not null default 'IN',
  state          text,
  city           text,
  address        text,
  account_status text not null default 'active'
                 check (account_status in ('active', 'pending', 'suspended')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 120),
  constraint profiles_country_fmt check (country ~ '^[A-Z]{2}$')
);
create index profiles_email_idx on public.profiles (lower(email));
create index profiles_account_status_idx on public.profiles (account_status);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------- user_roles ---
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('buyer', 'seller', 'admin', 'super_admin')),
  created_at timestamptz not null default now(),
  constraint user_roles_user_role_key unique (user_id, role)
);

-- -------------------------------------------------------- admin_audit_logs ---
-- Commercial/audit record: never cascaded, never updated, never deleted.
create table public.admin_audit_logs (
  id             uuid primary key default gen_random_uuid(),
  admin_user_id  uuid not null references public.profiles (id) on delete restrict,
  action         text not null,
  entity_type    text not null,
  entity_id      uuid,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index admin_audit_logs_entity_idx on public.admin_audit_logs (entity_type, entity_id);
create index admin_audit_logs_admin_idx on public.admin_audit_logs (admin_user_id);
create trigger admin_audit_logs_immutable before update or delete on public.admin_audit_logs
  for each row execute function public.prevent_mutation();

-- ------------------------------------------------------- role/status helpers ---
-- All helpers read trusted tables; none trusts client-supplied JWT metadata.
create or replace function public.current_account_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.account_status = 'active'
  );
$$;

create or replace function public.has_role(_role text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_account_active() and exists (
    select 1 from public.user_roles r where r.user_id = auth.uid() and r.role = _role
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_account_active() and exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('super_admin');
$$;

-- Internal: append an audit row attributed to the calling admin.
-- NOT callable by clients (EXECUTE revoked); only other definer functions use it.
create or replace function public._write_audit_log(
  _action text, _entity_type text, _entity_id uuid, _metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_logs (admin_user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), _action, _entity_type, _entity_id, coalesce(_metadata, '{}'::jsonb));
end;
$$;

-- ----------------------------------------------- signup: profile + role bootstrap ---
-- Runs as the table owner on auth.users INSERT. Idempotent (ON CONFLICT DO NOTHING).
-- raw_user_meta_data is client-supplied, so it can ONLY choose buyer vs seller;
-- any other value (including 'admin') degrades to buyer. Admin roles are never
-- derived from signup data.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_type text := coalesce(new.raw_user_meta_data ->> 'account_type', 'buyer');
begin
  if v_type not in ('buyer', 'seller') then
    v_type := 'buyer';
  end if;

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 120))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, v_type)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync with auth.users (email is not user-editable here).
create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Repair path for accounts whose signup trigger did not run (legacy/imported).
-- Idempotent; only ever creates the caller's own buyer profile/role.
create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_meta jsonb;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select u.email, u.raw_user_meta_data into v_email, v_meta from auth.users u where u.id = v_uid;
  if not found then
    raise exception 'user not found' using errcode = '28000';
  end if;
  insert into public.profiles (id, email, full_name)
  values (v_uid, v_email, left(nullif(trim(v_meta ->> 'full_name'), ''), 120))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (
    v_uid, case when v_meta ->> 'account_type' = 'seller' then 'seller' else 'buyer' end
  ) on conflict (user_id, role) do nothing;
end;
$$;

-- Self-service capability: a user may add buyer and/or seller capability.
-- Privileged roles cannot be self-assigned.
create or replace function public.grant_self_role(_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.current_account_active() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _role not in ('buyer', 'seller') then
    raise exception 'role % cannot be self-assigned', _role using errcode = '42501';
  end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), _role)
  on conflict (user_id, role) do nothing;
end;
$$;

-- Admin role management. admin/super_admin roles require a super_admin caller.
create or replace function public.admin_grant_role(_user_id uuid, _role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _role in ('admin', 'super_admin') and not public.is_super_admin() then
    raise exception 'only a super_admin can grant %', _role using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = _user_id) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  insert into public.user_roles (user_id, role) values (_user_id, _role)
  on conflict (user_id, role) do nothing;
  perform public._write_audit_log('role.grant', 'user', _user_id, jsonb_build_object('role', _role));
end;
$$;

create or replace function public.admin_revoke_role(_user_id uuid, _role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _user_id = auth.uid() then
    raise exception 'you cannot revoke your own roles' using errcode = '42501';
  end if;
  if _role in ('admin', 'super_admin') and not public.is_super_admin() then
    raise exception 'only a super_admin can revoke %', _role using errcode = '42501';
  end if;
  delete from public.user_roles where user_id = _user_id and role = _role;
  perform public._write_audit_log('role.revoke', 'user', _user_id, jsonb_build_object('role', _role));
end;
$$;

create or replace function public.admin_set_account_status(_user_id uuid, _status text, _reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if _status not in ('active', 'pending', 'suspended') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  if _user_id = auth.uid() then
    raise exception 'you cannot change your own account status' using errcode = '42501';
  end if;
  if exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin', 'super_admin'))
     and not public.is_super_admin() then
    raise exception 'only a super_admin can change an admin account' using errcode = '42501';
  end if;
  update public.profiles set account_status = _status where id = _user_id;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  perform public._write_audit_log('account.status', 'user', _user_id,
    jsonb_build_object('status', _status, 'reason', _reason));
end;
$$;

-- ----------------------------------------------------------- privileges + RLS ---
alter table public.profiles         enable row level security;
alter table public.user_roles       enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on table public.profiles         from public, anon, authenticated;
revoke all on table public.user_roles       from public, anon, authenticated;
revoke all on table public.admin_audit_logs from public, anon, authenticated;

grant select on public.profiles to authenticated;
-- Column-level: users can NEVER update id, email, account_status, timestamps.
grant update (full_name, phone, avatar_url, country, state, city, address)
  on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.admin_audit_logs to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_select_admin on public.profiles
  for select to authenticated using (public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() and public.current_account_active())
  with check (id = auth.uid());

create policy user_roles_select_own on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy user_roles_select_admin on public.user_roles
  for select to authenticated using (public.is_admin());

create policy admin_audit_logs_select_admin on public.admin_audit_logs
  for select to authenticated using (public.is_admin());

-- ------------------------------------------------------ function privileges ---
revoke all on function public.set_updated_at()        from public, anon, authenticated;
revoke all on function public.prevent_mutation()      from public, anon, authenticated;
revoke all on function public._write_audit_log(text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.handle_new_user()       from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;

revoke all on function public.current_account_active() from public, anon, authenticated;
revoke all on function public.has_role(text)           from public, anon, authenticated;
revoke all on function public.is_admin()               from public, anon, authenticated;
revoke all on function public.is_super_admin()         from public, anon, authenticated;
revoke all on function public.ensure_profile()         from public, anon, authenticated;
revoke all on function public.grant_self_role(text)    from public, anon, authenticated;
revoke all on function public.admin_grant_role(uuid, text)   from public, anon, authenticated;
revoke all on function public.admin_revoke_role(uuid, text)  from public, anon, authenticated;
revoke all on function public.admin_set_account_status(uuid, text, text) from public, anon, authenticated;

grant execute on function public.current_account_active() to authenticated;
grant execute on function public.has_role(text)           to authenticated;
grant execute on function public.is_admin()               to authenticated;
grant execute on function public.is_super_admin()         to authenticated;
grant execute on function public.ensure_profile()         to authenticated;
grant execute on function public.grant_self_role(text)    to authenticated;
grant execute on function public.admin_grant_role(uuid, text)  to authenticated;
grant execute on function public.admin_revoke_role(uuid, text) to authenticated;
grant execute on function public.admin_set_account_status(uuid, text, text) to authenticated;

comment on function public.handle_new_user() is
  'SECURITY DEFINER trigger on auth.users. Creates profile + buyer/seller role idempotently. Never grants admin.';
comment on function public.admin_grant_role(uuid, text) is
  'SECURITY DEFINER. Admin-only; admin/super_admin roles need a super_admin caller. Audited.';
comment on function public.admin_set_account_status(uuid, text, text) is
  'SECURITY DEFINER. Admin-only suspend/reactivate. Audited. Cannot target self; admin accounts need super_admin.';

