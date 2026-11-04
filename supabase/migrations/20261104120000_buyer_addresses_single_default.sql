-- =============================================================================
-- Migration: 20261104120000_buyer_addresses_single_default.sql
-- Module: Buyer Portal — Address Management Concurrency & Single Default Guarantee
-- Status: PREPARED FOR REVIEW ONLY (DO NOT APPLY AUTOMATICALLY TO HOSTED/LOCAL DB)
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. PREFLIGHT DATA TRUST AUDIT
-- Safely detects any existing duplicate default addresses without silent deletes
-- or data loss. If duplicates exist, raises an exception and outputs affected
-- buyer UUIDs (without exposing PII/personal data).
-- ----------------------------------------------------------------------------
do $$
declare
  v_dup_count integer;
  v_dup_buyers text;
begin
  select count(*)
  into v_dup_count
  from (
    select buyer_id
    from public.buyer_addresses
    where is_default = true
    group by buyer_id
    having count(*) > 1
  ) sub;

  if v_dup_count is not null and v_dup_count > 0 then
    select string_agg(buyer_id::text, ', ')
    into v_dup_buyers
    from (
      select buyer_id
      from public.buyer_addresses
      where is_default = true
      group by buyer_id
      having count(*) > 1
    ) sub;

    raise exception
      'PREFLIGHT CHECK FAILED: Found % buyer(s) with duplicate default addresses. Affected buyer IDs: [%]. Manual remediation required before applying this index. Please inspect and ensure each affected buyer has at most one default address before re-running.',
      v_dup_count, v_dup_buyers
      using errcode = '23505';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. ATOMIC RPC FUNCTION FOR DEFAULT ADDRESS ASSIGNMENT
-- Guarantees single-transaction atomicity under concurrent requests.
-- ----------------------------------------------------------------------------
create or replace function public.set_default_buyer_address(
  _address_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_target_buyer_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.current_account_active() then
    raise exception 'Account is inactive' using errcode = '42501';
  end if;

  -- Verify target address exists and belongs to the authenticated buyer
  select buyer_id into v_target_buyer_id
  from public.buyer_addresses
  where id = _address_id;

  if not found then
    raise exception 'Address not found' using errcode = 'P0002';
  end if;

  if v_target_buyer_id <> auth.uid() then
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

revoke all on function public.set_default_buyer_address(uuid) from public, anon, authenticated;
grant execute on function public.set_default_buyer_address(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. PARTIAL UNIQUE INDEX GUARANTEE
-- Guarantees at most ONE default address per buyer at the database engine level.
-- ----------------------------------------------------------------------------
create unique index if not exists buyer_addresses_single_default_idx
  on public.buyer_addresses (buyer_id)
  where is_default = true;

