-- ============================================================================
-- Migration: 20261111180000_subscription_entitlements_hardening.sql
-- Description: StoneB2B Phase 4.1 — Subscription Entitlement Hardening
--              1. Monthly Lead Allowance Engine & Atomic Credit Consumption
--              2. Listing Quota Hardening (Ownership transfers, over-limit archival)
--              3. Subscription Lifecycle State Machine (suspended status & grace)
--              4. Feature Entitlement Gates (Featured products, priority routing)
-- ============================================================================

-- 1. Alter subscription_plans to define monthly lead allowances & feature flags
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_monthly_leads integer DEFAULT 5;

-- Update canonical plans with monthly lead quotas and feature flags
UPDATE public.subscription_plans
SET
  max_monthly_leads = 5,
  features = jsonb_set(
    jsonb_set(features, '{featured_products}', 'false'::jsonb),
    '{priority_lead_routing}', 'false'::jsonb
  )
WHERE code = 'free';

UPDATE public.subscription_plans
SET
  max_monthly_leads = 50,
  features = jsonb_set(
    jsonb_set(features, '{featured_products}', 'true'::jsonb),
    '{priority_lead_routing}', 'true'::jsonb
  )
WHERE code = 'pro';

UPDATE public.subscription_plans
SET
  max_monthly_leads = NULL, -- NULL = unlimited
  features = jsonb_set(
    jsonb_set(features, '{featured_products}', 'true'::jsonb),
    '{priority_lead_routing}', 'true'::jsonb
  )
WHERE code = 'enterprise';

-- 2. Alter seller_subscriptions for custom lead overrides and suspended status
ALTER TABLE public.seller_subscriptions
  ADD COLUMN IF NOT EXISTS custom_max_monthly_leads integer DEFAULT NULL;

-- Update check constraint on status to include 'suspended'
ALTER TABLE public.seller_subscriptions
  DROP CONSTRAINT IF EXISTS seller_subscriptions_status_check;

ALTER TABLE public.seller_subscriptions
  ADD CONSTRAINT seller_subscriptions_status_check
  CHECK (status IN ('active', 'past_due', 'canceled', 'expired', 'trialing', 'suspended'));

-- Recreate partial unique index to include 'suspended' status
DROP INDEX IF EXISTS public.seller_subscriptions_single_active_idx;

CREATE UNIQUE INDEX seller_subscriptions_single_active_idx
  ON public.seller_subscriptions (seller_id)
  WHERE status IN ('active', 'trialing', 'past_due', 'suspended');

-- 3. Create seller_lead_usage Table (Durable Monthly Lead Allowance Ledger)
CREATE TABLE IF NOT EXISTS public.seller_lead_usage (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id             uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  enquiry_id            uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  billing_period_start  timestamptz NOT NULL,
  billing_period_end    timestamptz NOT NULL,
  action                text NOT NULL DEFAULT 'assigned' CHECK (action IN ('assigned', 'reversal', 'admin_credit')),
  credits_consumed      integer NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seller_lead_usage_unique_assignment UNIQUE (seller_id, enquiry_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_lead_usage_seller_period
  ON public.seller_lead_usage (seller_id, billing_period_start, billing_period_end);

CREATE INDEX IF NOT EXISTS idx_seller_lead_usage_enquiry
  ON public.seller_lead_usage (enquiry_id);

ALTER TABLE public.seller_lead_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_lead_usage_select_seller" ON public.seller_lead_usage;
CREATE POLICY "seller_lead_usage_select_seller"
  ON public.seller_lead_usage
  FOR SELECT TO authenticated
  USING (public.is_seller_owner(seller_id));

DROP POLICY IF EXISTS "seller_lead_usage_admin_manage" ON public.seller_lead_usage;
CREATE POLICY "seller_lead_usage_admin_manage"
  ON public.seller_lead_usage
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.seller_lead_usage TO authenticated;
GRANT ALL ON public.seller_lead_usage TO service_role;

-- 4. Update Server-Side Entitlement Resolution Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_seller_subscription_entitlements(_seller_id uuid)
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
  v_is_over_listings boolean := false;
  v_can_create boolean;
  v_effective_max_leads integer;
  v_used_monthly_leads integer;
  v_remaining_monthly_leads integer;
  v_can_receive_leads boolean;
  v_is_expired boolean := false;
  v_is_suspended boolean := false;
  v_in_grace boolean := false;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_now timestamptz := now();
BEGIN
  -- 1. Find the seller's primary active, trialing, past_due, or suspended subscription
  SELECT s.*, p.code as plan_code, p.name as plan_name,
         p.max_active_listings as plan_max_listings,
         p.max_monthly_leads as plan_max_leads,
         p.features as plan_features
  INTO v_sub
  FROM public.seller_subscriptions s
  JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.seller_id = _seller_id
    AND s.status IN ('active', 'trialing', 'past_due', 'suspended')
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
    IF NOT v_is_suspended AND v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end < v_now THEN
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

-- 5. Atomic Lead Credit Consumption Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.consume_seller_lead_credit(
  _seller_id uuid,
  _enquiry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entitlements jsonb;
  v_already_consumed boolean;
  v_can_receive boolean;
  v_remaining integer;
  v_max integer;
  v_used integer;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_plan_name text;
  v_status text;
BEGIN
  -- 1. Idempotency Check: Already consumed for this specific enquiry?
  SELECT EXISTS (
    SELECT 1 FROM public.seller_lead_usage
    WHERE seller_id = _seller_id AND enquiry_id = _enquiry_id
  ) INTO v_already_consumed;

  IF v_already_consumed THEN
    v_entitlements := public.get_seller_subscription_entitlements(_seller_id);
    RETURN jsonb_build_object(
      'success', true,
      'already_consumed', true,
      'used', (v_entitlements ->> 'used_monthly_leads')::integer,
      'remaining', (v_entitlements ->> 'remaining_monthly_leads')::integer,
      'is_unlimited', (v_entitlements ->> 'is_unlimited_leads')::boolean
    );
  END IF;

  -- 2. Concurrency Control: Advisory transaction lock per seller
  PERFORM pg_advisory_xact_lock(hashtext('lead_limit_' || _seller_id::text));

  -- 3. Resolve Entitlements
  v_entitlements := public.get_seller_subscription_entitlements(_seller_id);
  v_status := (v_entitlements ->> 'status');
  v_can_receive := (v_entitlements ->> 'can_receive_leads')::boolean;
  v_max := (v_entitlements ->> 'max_monthly_leads')::integer;
  v_used := (v_entitlements ->> 'used_monthly_leads')::integer;
  v_plan_name := (v_entitlements ->> 'plan_name');
  v_period_start := (v_entitlements ->> 'billing_period_start')::timestamptz;
  v_period_end := (v_entitlements ->> 'billing_period_end')::timestamptz;

  IF v_status = 'suspended' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SUBSCRIPTION_SUSPENDED',
      'reason', 'Seller subscription is suspended. Cannot receive leads.'
    );
  END IF;

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

  -- 4. Record consumption
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
  )
  ON CONFLICT (seller_id, enquiry_id) DO NOTHING;

  -- Calculate remaining
  IF v_max IS NULL THEN
    v_remaining := NULL;
  ELSE
    v_remaining := GREATEST(0, v_max - (v_used + 1));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_consumed', false,
    'used', v_used + 1,
    'remaining', v_remaining,
    'is_unlimited', (v_max IS NULL)
  );
END;
$$;

-- 6. Hardened Listing Limit Trigger Function
CREATE OR REPLACE FUNCTION public.check_seller_product_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entitlements jsonb;
  v_can_create boolean;
  v_is_suspended boolean;
  v_max_listings integer;
  v_current_count integer;
  v_plan_name text;
  v_is_unlimited boolean;
BEGIN
  -- Always allow transitions TO archived or rejected (even when over-limit)
  IF NEW.moderation_status IN ('archived', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- If updating an already-active product without changing moderation status or seller, allow
  IF TG_OP = 'UPDATE' THEN
    IF OLD.moderation_status NOT IN ('archived', 'rejected') AND OLD.seller_id = NEW.seller_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Destination seller transaction lock to serialize concurrent insertions and ownership transfers
  PERFORM pg_advisory_xact_lock(hashtext('product_limit_' || NEW.seller_id::text));

  -- Query destination seller entitlements
  v_entitlements := public.get_seller_subscription_entitlements(NEW.seller_id);
  v_is_suspended := COALESCE((v_entitlements ->> 'is_suspended')::boolean, false);
  v_can_create := (v_entitlements ->> 'can_create_listing')::boolean;
  v_is_unlimited := (v_entitlements ->> 'is_unlimited_listings')::boolean;

  IF v_is_suspended THEN
    RAISE EXCEPTION 'Listing blocked: Seller subscription is currently suspended.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_is_unlimited AND NOT v_can_create THEN
    v_max_listings := (v_entitlements ->> 'max_active_listings')::integer;
    v_current_count := (v_entitlements ->> 'active_listings_count')::integer;
    v_plan_name := (v_entitlements ->> 'plan_name');

    RAISE EXCEPTION 'Listing limit exceeded: Your % subscription plan allows a maximum of % active listings (currently % used). Upgrade your plan or archive existing products.',
      v_plan_name, v_max_listings, v_current_count
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached to INSERT or UPDATE of moderation_status, seller_id
DROP TRIGGER IF EXISTS trg_check_seller_product_listing_limit ON public.products;
CREATE TRIGGER trg_check_seller_product_listing_limit
  BEFORE INSERT OR UPDATE OF moderation_status, seller_id
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_seller_product_listing_limit();

-- 7. Update Admin Modify Subscription RPC to support custom leads and suspended status
DROP FUNCTION IF EXISTS public.admin_modify_seller_subscription(uuid, text, text, boolean, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_modify_seller_subscription(
  _seller_id uuid,
  _target_plan_code text,
  _reason text,
  _is_promotional boolean DEFAULT false,
  _custom_max_listings integer DEFAULT NULL,
  _period_days integer DEFAULT NULL,
  _custom_max_monthly_leads integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target_plan record;
  v_current_sub record;
  v_new_sub_id uuid;
  v_period_end timestamptz := NULL;
  v_event_type text;
  v_actor_id uuid := auth.uid();
BEGIN
  -- Only authenticated admins can invoke this RPC
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify seller subscriptions.'
      USING ERRCODE = '42501';
  END IF;

  -- Validate target plan exists
  SELECT * INTO v_target_plan
  FROM public.subscription_plans
  WHERE code = _target_plan_code AND is_active = true;

  IF v_target_plan.id IS NULL THEN
    RAISE EXCEPTION 'Invalid target plan code: %', _target_plan_code
      USING ERRCODE = 'P0002';
  END IF;

  -- Calculate custom period if days provided
  IF _period_days IS NOT NULL AND _period_days > 0 THEN
    v_period_end := now() + (_period_days || ' days')::interval;
  END IF;

  -- Lock and fetch current active/suspended subscription
  SELECT * INTO v_current_sub
  FROM public.seller_subscriptions
  WHERE seller_id = _seller_id
    AND status IN ('active', 'trialing', 'past_due', 'suspended')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_current_sub.id IS NOT NULL THEN
    -- Determine event type
    IF _is_promotional THEN
      v_event_type := 'grant_added';
    ELSIF v_current_sub.plan_id = v_target_plan.id THEN
      v_event_type := 'plan_changed';
    ELSE
      v_event_type := 'upgraded';
    END IF;

    -- Update existing record
    UPDATE public.seller_subscriptions
    SET
      plan_id = v_target_plan.id,
      status = 'active',
      promotional_grant = _is_promotional,
      custom_max_listings = _custom_max_listings,
      custom_max_monthly_leads = _custom_max_monthly_leads,
      current_period_start = now(),
      current_period_end = v_period_end,
      grace_period_end = NULL,
      updated_at = now()
    WHERE id = v_current_sub.id
    RETURNING id INTO v_new_sub_id;
  ELSE
    -- Insert new subscription
    v_event_type := 'created';
    INSERT INTO public.seller_subscriptions (
      seller_id,
      plan_id,
      status,
      billing_cycle,
      promotional_grant,
      custom_max_listings,
      custom_max_monthly_leads,
      current_period_start,
      current_period_end
    )
    VALUES (
      _seller_id,
      v_target_plan.id,
      'active',
      'monthly',
      _is_promotional,
      _custom_max_listings,
      _custom_max_monthly_leads,
      now(),
      v_period_end
    )
    RETURNING id INTO v_new_sub_id;
  END IF;

  -- Insert immutable audit event
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
    v_new_sub_id,
    _seller_id,
    v_event_type,
    v_current_sub.plan_id,
    v_target_plan.id,
    'admin',
    v_actor_id,
    _reason,
    jsonb_build_object(
      'is_promotional', _is_promotional,
      'custom_max_listings', _custom_max_listings,
      'custom_max_monthly_leads', _custom_max_monthly_leads,
      'period_days', _period_days
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_new_sub_id,
    'plan_code', v_target_plan.code,
    'event_type', v_event_type
  );
END;
$$;
