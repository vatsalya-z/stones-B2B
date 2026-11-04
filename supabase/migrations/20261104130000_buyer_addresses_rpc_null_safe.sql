-- Migration: 20261104130000_buyer_addresses_rpc_null_safe.sql
-- Description: Phase 5.7 — RPC Edge-Case Security & NULL-Safe Ownership Validation
-- Hardens public.set_default_buyer_address(_address_id uuid) against:
-- 1. NULL input arguments (_address_id IS NULL)
-- 2. SQL 3-valued logic bypass on ownership comparison (IS DISTINCT FROM / IS NULL checks)
-- 3. Guarantees existing defaults are never touched when an invalid/foreign/null ID is supplied.

create or replace function public.set_default_buyer_address(_address_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_buyer_id uuid;
begin
  -- Guard 1: Verify authenticated caller session exists
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Guard 2: Verify caller account is active
  if not public.current_account_active() then
    raise exception 'Account is inactive' using errcode = '42501';
  end if;

  -- Guard 3: Reject NULL address identifier explicitly
  if _address_id is null then
    raise exception 'Address identifier is required' using errcode = '22004';
  end if;

  -- Guard 4: Look up target address record
  select buyer_id into v_target_buyer_id
  from public.buyer_addresses
  where id = _address_id;

  if not found or v_target_buyer_id is null then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  -- Guard 5: Safe NULL-aware ownership check (handles three-valued logic)
  if v_target_buyer_id is distinct from auth.uid() then
    raise exception 'Unauthorized to modify this address' using errcode = '42501';
  end if;

  -- Step 1: Clear existing default addresses for this buyer
  update public.buyer_addresses
  set is_default = false, updated_at = now()
  where buyer_id = auth.uid() and is_default = true;

  -- Step 2: Set the designated address as default
  update public.buyer_addresses
  set is_default = true, updated_at = now()
  where id = _address_id and buyer_id = auth.uid();

  return _address_id;
end;
$$;

revoke all on function public.set_default_buyer_address(uuid) from public, anon;
grant execute on function public.set_default_buyer_address(uuid) to authenticated, service_role;

