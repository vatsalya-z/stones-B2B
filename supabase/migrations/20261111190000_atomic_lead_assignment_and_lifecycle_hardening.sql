-- Migration: 20261111190000_atomic_lead_assignment_and_lifecycle_hardening.sql
-- Description:
-- 1. Service-role compatibility in `is_admin()` for server actions and service role clients
-- 2. State-machine tracking column (`previous_status`) for subscription suspension/restoration
-- 3. Atomic lead assignment and credit consumption RPC (`assign_rfq_lead_with_credit`)
-- 4. Dedicated atomic suspension and restoration RPCs (`admin_suspend_seller_subscription`, `admin_restore_seller_subscription`)
-- 5. Expiration safety checks during restoration to prevent unrenewed reactivation

-- 0. Ensure `is_admin()` recognizes service_role execution contexts and is null-safe
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(
    (auth.role() = 'service_role') OR (
      public.current_account_active() AND EXISTS (
        SELECT 1 FROM public.user_roles r
        WHERE r.user_id = auth.uid() AND r.role IN ('admin', 'super_admin')
      )
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 1. Add `previous_status` column to `seller_subscriptions` to remember prior valid state
ALTER TABLE public.seller_subscriptions
  ADD COLUMN IF NOT EXISTS previous_status text DEFAULT NULL;

ALTER TABLE public.seller_subscriptions
  DROP CONSTRAINT IF EXISTS seller_subscriptions_previous_status_check;

ALTER TABLE public.seller_subscriptions
  ADD CONSTRAINT seller_subscriptions_previous_status_check
  CHECK (previous_status IS NULL OR previous_status IN ('active', 'trialing', 'past_due', 'canceled', 'expired'));

-- 2. Atomic Lead Assignment & Consumption Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.assign_rfq_lead_with_credit(
  _enquiry_id uuid,
  _seller_id uuid,
  _match_score integer DEFAULT 0,
  _match_reasons jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_assignment record;
  v_entitlements jsonb;
  v_status text;
  v_can_receive boolean;
  v_max integer;
  v_used integer;
  v_remaining integer;
  v_is_unlimited boolean;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_plan_name text;
  v_assignment_id uuid;
BEGIN
  -- 1. Idempotency Check: Already assigned to this seller for this enquiry?
  SELECT id, status, notification_status INTO v_existing_assignment
  FROM public.lead_assignments
  WHERE enquiry_id = _enquiry_id AND seller_id = _seller_id;

  IF v_existing_assignment.id IS NOT NULL THEN
    v_entitlements := public.get_seller_subscription_entitlements(_seller_id);
    RETURN jsonb_build_object(
      'success', true,
      'already_assigned', true,
      'assigned', false,
      'assignment_id', v_existing_assignment.id,
      'notification_status', v_existing_assignment.notification_status,
      'used', (v_entitlements ->> 'used_monthly_leads')::integer,
      'remaining', (v_entitlements ->> 'remaining_monthly_leads')::integer,
      'is_unlimited', (v_entitlements ->> 'is_unlimited_leads')::boolean
    );
  END IF;

  -- 2. Concurrency Control: Advisory transaction lock per seller
  PERFORM pg_advisory_xact_lock(hashtext('lead_limit_' || _seller_id::text));

  -- Re-check idempotency under lock in case of race condition
  SELECT id, status, notification_status INTO v_existing_assignment
  FROM public.lead_assignments
  WHERE enquiry_id = _enquiry_id AND seller_id = _seller_id;

  IF v_existing_assignment.id IS NOT NULL THEN
    v_entitlements := public.get_seller_subscription_entitlements(_seller_id);
    RETURN jsonb_build_object(
      'success', true,
      'already_assigned', true,
      'assigned', false,
      'assignment_id', v_existing_assignment.id,
      'notification_status', v_existing_assignment.notification_status,
      'used', (v_entitlements ->> 'used_monthly_leads')::integer,
      'remaining', (v_entitlements ->> 'remaining_monthly_leads')::integer,
      'is_unlimited', (v_entitlements ->> 'is_unlimited_leads')::boolean
    );
  END IF;

  -- 3. Resolve Entitlements
  v_entitlements := public.get_seller_subscription_entitlements(_seller_id);
  v_status := (v_entitlements ->> 'status');
  v_can_receive := (v_entitlements ->> 'can_receive_leads')::boolean;
  v_max := (v_entitlements ->> 'max_monthly_leads')::integer;
  v_used := (v_entitlements ->> 'used_monthly_leads')::integer;
  v_plan_name := (v_entitlements ->> 'plan_name');
  v_period_start := (v_entitlements ->> 'billing_period_start')::timestamptz;
  v_period_end := (v_entitlements ->> 'billing_period_end')::timestamptz;
  v_is_unlimited := (v_entitlements ->> 'is_unlimited_leads')::boolean;

  -- Check if suspended
  IF v_status = 'suspended' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SUBSCRIPTION_SUSPENDED',
      'reason', 'Seller subscription is suspended. Cannot receive leads.'
    );
  END IF;

  -- Check if quota exhausted
  IF NOT v_can_receive THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MONTHLY_LEAD_LIMIT_EXCEEDED',
      'reason', format('Monthly lead quota exhausted (%s/%s used for %s plan). Upgrade to Pro or Enterprise for additional leads.', v_used, v_max, v_plan_name),
      'used', v_used,
      'max', v_max,
      'remaining', 0
    );
  END IF;

  -- 4. Record consumption in ledger
  INSERT INTO public.seller_lead_usage (
    seller_id,
    enquiry_id,
    billing_period_start,
    billing_period_end,
    action,
    credits_consumed
  )
  VALUES (
    _seller_id,
    _enquiry_id,
    v_period_start,
    v_period_end,
    'assigned',
    1
  );

  -- 5. Record lead assignment in lead_assignments
  INSERT INTO public.lead_assignments (
    enquiry_id,
    seller_id,
    match_score,
    match_reasons,
    status,
    notification_status
  )
  VALUES (
    _enquiry_id,
    _seller_id,
    COALESCE(_match_score, 0),
    COALESCE(_match_reasons, '[]'::jsonb),
    'assigned',
    'pending'
  )
  RETURNING id INTO v_assignment_id;

  -- 6. Calculate updated remaining leads
  IF v_max IS NULL THEN
    v_remaining := NULL;
  ELSE
    v_remaining := GREATEST(0, v_max - (v_used + 1));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_assigned', false,
    'assigned', true,
    'assignment_id', v_assignment_id,
    'used', v_used + 1,
    'remaining', v_remaining,
    'is_unlimited', v_is_unlimited
  );
END;
$$;

-- 3. Atomic Subscription Suspension RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_suspend_seller_subscription(
  _seller_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub record;
  v_actor_id uuid := auth.uid();
BEGIN
  -- Only platform administrators can suspend subscriptions
  IF NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can suspend seller subscriptions.'
      USING ERRCODE = '42501';
  END IF;

  -- Find active or past_due or trialing subscription
  SELECT * INTO v_sub
  FROM public.seller_subscriptions
  WHERE seller_id = _seller_id
    AND status IN ('active', 'trialing', 'past_due')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'No active subscription found to suspend for seller %', _seller_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Store previous status and set status to suspended
  UPDATE public.seller_subscriptions
  SET
    previous_status = v_sub.status,
    status = 'suspended',
    updated_at = now()
  WHERE id = v_sub.id;

  -- Insert audit event
  INSERT INTO public.subscription_events (
    subscription_id,
    seller_id,
    event_type,
    previous_plan_id,
    new_plan_id,
    triggered_by,
    actor_id,
    notes,
    metadata
  )
  VALUES (
    v_sub.id,
    _seller_id,
    'suspended',
    v_sub.plan_id,
    v_sub.plan_id,
    'admin',
    v_actor_id,
    _reason,
    jsonb_build_object('previous_status', v_sub.status)
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub.id,
    'status', 'suspended',
    'previous_status', v_sub.status
  );
END;
$$;

-- 4. Atomic Subscription Restoration RPC (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_restore_seller_subscription(
  _seller_id uuid,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub record;
  v_actor_id uuid := auth.uid();
  v_target_status text;
  v_was_expired boolean := false;
BEGIN
  -- Only platform administrators can restore subscriptions
  IF NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can restore seller subscriptions.'
      USING ERRCODE = '42501';
  END IF;

  -- Find suspended subscription
  SELECT * INTO v_sub
  FROM public.seller_subscriptions
  WHERE seller_id = _seller_id
    AND status = 'suspended'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'No suspended subscription found to restore for seller %', _seller_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Check if the subscription expired while suspended
  IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end < now() THEN
    -- Period expired: restore as 'expired' to preserve subscription lifecycle integrity
    v_target_status := 'expired';
    v_was_expired := true;
  ELSE
    -- Restore to prior valid status, default to 'active'
    v_target_status := COALESCE(v_sub.previous_status, 'active');
  END IF;

  -- Update subscription
  UPDATE public.seller_subscriptions
  SET
    status = v_target_status,
    previous_status = NULL,
    updated_at = now()
  WHERE id = v_sub.id;

  -- Insert audit event
  INSERT INTO public.subscription_events (
    subscription_id,
    seller_id,
    event_type,
    previous_plan_id,
    new_plan_id,
    triggered_by,
    actor_id,
    notes,
    metadata
  )
  VALUES (
    v_sub.id,
    _seller_id,
    'restored',
    v_sub.plan_id,
    v_sub.plan_id,
    'admin',
    v_actor_id,
    _reason,
    jsonb_build_object(
      'restored_status', v_target_status,
      'previous_status', v_sub.previous_status,
      'was_expired', v_was_expired
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub.id,
    'status', v_target_status,
    'previous_status', v_sub.previous_status,
    'was_expired', v_was_expired
  );
END;
$$;

-- 5. Updated Entitlements Function: Supports expired status explicitly (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_seller_subscription_entitlements(
  _seller_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub record;
  v_plan record;
  v_active_listings_count integer;
  v_effective_max_listings integer;
  v_remaining_listings integer;
  v_is_over_listings boolean;
  v_can_create boolean;
  v_effective_max_leads integer;
  v_used_monthly_leads integer;
  v_remaining_monthly_leads integer;
  v_can_receive_leads boolean;
  v_in_grace boolean := false;
  v_is_expired boolean := false;
  v_is_suspended boolean := false;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_now timestamptz := now();
BEGIN
  -- 1. Find the seller's primary active, trialing, past_due, suspended, or expired subscription
  SELECT s.*, p.code as plan_code, p.name as plan_name,
         p.max_active_listings as plan_max_listings,
         p.max_monthly_leads as plan_max_leads,
         p.features as plan_features
  INTO v_sub
  FROM public.seller_subscriptions s
  JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.seller_id = _seller_id
    AND s.status IN ('active', 'trialing', 'past_due', 'suspended', 'expired')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- 2. If no subscription found, default to Free Plan
  IF v_sub.id IS NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE code = 'free';
    v_sub.plan_code := v_plan.code;
    v_sub.plan_name := v_plan.name;
    v_sub.plan_max_listings := v_plan.max_active_listings;
    v_sub.plan_max_leads := v_plan.max_monthly_leads;
    v_sub.plan_features := v_plan.features;
    v_sub.status := 'active';
    v_sub.promotional_grant := false;
    v_sub.current_period_start := NULL;
    v_sub.current_period_end := NULL;
    v_sub.grace_period_end := NULL;
    v_sub.custom_max_listings := NULL;
    v_sub.custom_max_monthly_leads := NULL;
  ELSE
    -- Check if administratively suspended
    IF v_sub.status = 'suspended' THEN
      v_is_suspended := true;
    END IF;

    -- Check expiration and grace period (only for non-suspended)
    IF v_sub.status = 'expired' OR (NOT v_is_suspended AND v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end < v_now) THEN
      IF v_sub.grace_period_end IS NOT NULL AND v_sub.grace_period_end >= v_now THEN
        v_in_grace := true;
      ELSE
        v_is_expired := true;
        -- Expired subscriptions fall back to Free Plan quota & capabilities
        SELECT * INTO v_plan FROM public.subscription_plans WHERE code = 'free';
        v_sub.plan_code := v_plan.code;
        v_sub.plan_name := v_plan.name || ' (Expired Fallback)';
        v_sub.plan_max_listings := v_plan.max_active_listings;
        v_sub.plan_max_leads := v_plan.max_monthly_leads;
        v_sub.plan_features := v_plan.features;
        v_sub.custom_max_listings := NULL;
        v_sub.custom_max_monthly_leads := NULL;
      END IF;
    END IF;
  END IF;

  -- 3. Calculate Billing Period Boundaries (Asia/Kolkata timezone awareness)
  IF v_sub.current_period_start IS NOT NULL AND v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end > v_now THEN
    v_period_start := v_sub.current_period_start;
    v_period_end := v_sub.current_period_end;
  ELSE
    -- Calendar month boundary in Asia/Kolkata
    v_period_start := date_trunc('month', (v_now AT TIME ZONE 'Asia/Kolkata')) AT TIME ZONE 'Asia/Kolkata';
    v_period_end := (date_trunc('month', (v_now AT TIME ZONE 'Asia/Kolkata')) + interval '1 month') AT TIME ZONE 'Asia/Kolkata';
  END IF;

  -- 4. Calculate Effective Max Listings & Active Listings Count
  v_effective_max_listings := COALESCE(v_sub.custom_max_listings, v_sub.plan_max_listings);

  SELECT count(*)
  INTO v_active_listings_count
  FROM public.products
  WHERE seller_id = _seller_id
    AND moderation_status NOT IN ('archived', 'rejected');

  IF v_effective_max_listings IS NULL THEN
    v_remaining_listings := NULL; -- Unlimited
    v_is_over_listings := false;
    v_can_create := NOT v_is_suspended;
  ELSE
    v_remaining_listings := GREATEST(0, v_effective_max_listings - v_active_listings_count);
    v_is_over_listings := (v_active_listings_count > v_effective_max_listings);
    v_can_create := (v_active_listings_count < v_effective_max_listings) AND NOT v_is_suspended;
  END IF;

  -- 5. Calculate Monthly Lead Quota & Usage
  v_effective_max_leads := COALESCE(v_sub.custom_max_monthly_leads, v_sub.plan_max_leads);

  SELECT COALESCE(sum(credits_consumed), 0)
  INTO v_used_monthly_leads
  FROM public.seller_lead_usage
  WHERE seller_id = _seller_id
    AND created_at >= v_period_start
    AND created_at < v_period_end;

  IF v_effective_max_leads IS NULL THEN
    v_remaining_monthly_leads := NULL; -- Unlimited
    v_can_receive_leads := NOT v_is_suspended;
  ELSE
    v_remaining_monthly_leads := GREATEST(0, v_effective_max_leads - v_used_monthly_leads);
    v_can_receive_leads := (v_used_monthly_leads < v_effective_max_leads) AND NOT v_is_suspended;
  END IF;

  RETURN jsonb_build_object(
    'seller_id', _seller_id,
    'subscription_id', v_sub.id,
    'plan_code', v_sub.plan_code,
    'plan_name', v_sub.plan_name,
    'status', v_sub.status,
    'max_active_listings', v_effective_max_listings,
    'active_listings_count', v_active_listings_count,
    'remaining_listings', v_remaining_listings,
    'is_over_listing_limit', v_is_over_listings,
    'can_create_listing', v_can_create,
    'is_unlimited_listings', (v_effective_max_listings IS NULL),
    'max_monthly_leads', v_effective_max_leads,
    'used_monthly_leads', v_used_monthly_leads,
    'remaining_monthly_leads', v_remaining_monthly_leads,
    'can_receive_leads', v_can_receive_leads,
    'is_unlimited_leads', (v_effective_max_leads IS NULL),
    'billing_period_start', v_period_start,
    'billing_period_end', v_period_end,
    'current_period_end', v_sub.current_period_end,
    'grace_period_end', v_sub.grace_period_end,
    'is_in_grace_period', v_in_grace,
    'is_expired', v_is_expired,
    'is_suspended', v_is_suspended,
    'is_promotional', COALESCE(v_sub.promotional_grant, false),
    'features', v_sub.plan_features
  );
END;
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_seller_subscription_entitlements(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_rfq_lead_with_credit(uuid, uuid, integer, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_suspend_seller_subscription(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_seller_subscription(uuid, text) TO authenticated, service_role;
