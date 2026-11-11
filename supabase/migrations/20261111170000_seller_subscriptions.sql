-- ============================================================================
-- Migration: 20261111170000_seller_subscriptions.sql
-- Description: StoneB2B Phase 4 — Seller Subscription & Monetization Engine
-- Tables: subscription_plans, seller_subscriptions, subscription_events
-- Security: RLS, concurrency-safe product listing trigger, admin RPCs
-- ============================================================================

-- 1. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text NOT NULL UNIQUE,
  name                 text NOT NULL,
  description          text,
  max_active_listings  integer DEFAULT NULL, -- NULL means unlimited
  price_monthly        numeric(10, 2) DEFAULT NULL, -- NULL = unset/preview mode
  currency             text NOT NULL DEFAULT 'INR' CHECK (currency ~ '^[A-Z]{3}$'),
  features             jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active            boolean NOT NULL DEFAULT true,
  is_public            boolean NOT NULL DEFAULT true,
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Seed Canonical Plans (Free, Pro, Enterprise)
INSERT INTO public.subscription_plans (code, name, description, max_active_listings, price_monthly, currency, features, sort_order)
VALUES
  (
    'free',
    'Free',
    'Essential foundation for stone suppliers starting on StonesDekho.',
    5,
    NULL,
    'INR',
    '{
      "storefront": "basic",
      "analytics": "basic",
      "priority_support": false,
      "lead_access": "standard",
      "badge": null,
      "rfq_response_limit": 10,
      "custom_domain": false
    }'::jsonb,
    1
  ),
  (
    'pro',
    'Pro',
    'Designed for established natural stone manufacturers & quarries expanding distribution.',
    100,
    NULL,
    'INR',
    '{
      "storefront": "premium",
      "analytics": "advanced",
      "priority_support": false,
      "lead_access": "high",
      "badge": "Verified Pro",
      "rfq_response_limit": 50,
      "custom_domain": false
    }'::jsonb,
    2
  ),
  (
    'enterprise',
    'Enterprise',
    'Unlimited scale, priority matching, and dedicated account management for large operations.',
    NULL,
    NULL,
    'INR',
    '{
      "storefront": "advanced",
      "analytics": "advanced",
      "priority_support": true,
      "lead_access": "unlimited",
      "badge": "Enterprise Leader",
      "rfq_response_limit": null,
      "custom_domain": true,
      "custom_entitlements": true
    }'::jsonb,
    3
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_active_listings = EXCLUDED.max_active_listings,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- 2. Seller Subscriptions Table
CREATE TABLE IF NOT EXISTS public.seller_subscriptions (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id              uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  plan_id                uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status                 text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired', 'trialing')),
  billing_cycle          text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
  started_at             timestamptz NOT NULL DEFAULT now(),
  current_period_start   timestamptz NOT NULL DEFAULT now(),
  current_period_end     timestamptz DEFAULT NULL,
  grace_period_end       timestamptz DEFAULT NULL,
  canceled_at            timestamptz DEFAULT NULL,
  cancel_at_period_end   boolean NOT NULL DEFAULT false,
  promotional_grant      boolean NOT NULL DEFAULT false,
  granted_by             uuid REFERENCES public.profiles(id) DEFAULT NULL,
  grant_reason           text DEFAULT NULL,
  custom_max_listings    integer DEFAULT NULL CHECK (custom_max_listings IS NULL OR custom_max_listings >= 0),
  billing_provider       text DEFAULT NULL CHECK (billing_provider IS NULL OR billing_provider IN ('razorpay', 'stripe', 'manual', 'cashfree', 'custom')),
  billing_customer_id    text DEFAULT NULL,
  billing_subscription_id text DEFAULT NULL,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Crucial: Guarantee no seller can have multiple conflicting active/trialing/past_due subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS seller_subscriptions_single_active_idx
  ON public.seller_subscriptions (seller_id)
  WHERE status IN ('active', 'trialing', 'past_due');

CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_seller
  ON public.seller_subscriptions (seller_id, status);

CREATE INDEX IF NOT EXISTS idx_seller_subscriptions_expiry
  ON public.seller_subscriptions (current_period_end)
  WHERE status = 'active';

-- 3. Subscription Events Audit Table
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  uuid REFERENCES public.seller_subscriptions(id) ON DELETE CASCADE,
  seller_id        uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  event_type       text NOT NULL CHECK (
    event_type IN (
      'created',
      'upgraded',
      'downgraded',
      'renewed',
      'canceled',
      'expired',
      'grant_added',
      'grant_revoked',
      'suspended',
      'restored',
      'listing_blocked',
      'plan_changed'
    )
  ),
  previous_plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  new_plan_id      uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  triggered_by     text NOT NULL DEFAULT 'system' CHECK (triggered_by IN ('seller', 'admin', 'system')),
  actor_id         uuid REFERENCES public.profiles(id) DEFAULT NULL,
  notes            text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_seller
  ON public.subscription_events (seller_id, created_at DESC);

-- 4. Server-Side Entitlement Resolution Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_seller_subscription_entitlements(_seller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub record;
  v_plan record;
  v_active_count integer;
  v_effective_max integer;
  v_remaining integer;
  v_can_create boolean;
  v_is_expired boolean := false;
  v_in_grace boolean := false;
  v_now timestamptz := now();
BEGIN
  -- 1. Find the seller's active or trialing subscription
  SELECT s.*, p.code as plan_code, p.name as plan_name, p.max_active_listings as plan_max, p.features as plan_features
  INTO v_sub
  FROM public.seller_subscriptions s
  JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.seller_id = _seller_id
    AND s.status IN ('active', 'trialing', 'past_due')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- 2. If no subscription found, default to Free Plan
  IF v_sub.id IS NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE code = 'free';
    v_sub.plan_code := v_plan.code;
    v_sub.plan_name := v_plan.name;
    v_sub.plan_max := v_plan.max_active_listings;
    v_sub.plan_features := v_plan.features;
    v_sub.status := 'active';
    v_sub.promotional_grant := false;
    v_sub.current_period_end := NULL;
    v_sub.custom_max_listings := NULL;
  ELSE
    -- Check expiration and grace period
    IF v_sub.current_period_end IS NOT NULL AND v_sub.current_period_end < v_now THEN
      IF v_sub.grace_period_end IS NOT NULL AND v_sub.grace_period_end >= v_now THEN
        v_in_grace := true;
      ELSE
        v_is_expired := true;
        -- Fallback to free plan capabilities on expiration
        SELECT * INTO v_plan FROM public.subscription_plans WHERE code = 'free';
        v_sub.plan_code := v_plan.code;
        v_sub.plan_name := v_plan.name || ' (Expired Fallback)';
        v_sub.plan_max := v_plan.max_active_listings;
        v_sub.plan_features := v_plan.features;
        v_sub.custom_max_listings := NULL;
      END IF;
    END IF;
  END IF;

  -- 3. Calculate Effective Max Listings
  v_effective_max := COALESCE(v_sub.custom_max_listings, v_sub.plan_max);

  -- 4. Count current active listings (draft, pending_review, approved count; archived and rejected do NOT count)
  SELECT count(*)
  INTO v_active_count
  FROM public.products
  WHERE seller_id = _seller_id
    AND moderation_status NOT IN ('archived', 'rejected');

  -- 5. Calculate Remaining and can_create
  IF v_effective_max IS NULL THEN
    v_remaining := NULL; -- Unlimited
    v_can_create := true;
  ELSE
    v_remaining := GREATEST(0, v_effective_max - v_active_count);
    v_can_create := (v_active_count < v_effective_max);
  END IF;

  RETURN jsonb_build_object(
    'seller_id', _seller_id,
    'subscription_id', v_sub.id,
    'plan_code', v_sub.plan_code,
    'plan_name', v_sub.plan_name,
    'status', v_sub.status,
    'max_active_listings', v_effective_max,
    'active_listings_count', v_active_count,
    'remaining_listings', v_remaining,
    'can_create_listing', v_can_create,
    'is_unlimited', (v_effective_max IS NULL),
    'current_period_end', v_sub.current_period_end,
    'is_in_grace_period', v_in_grace,
    'is_expired', v_is_expired,
    'is_promotional', COALESCE(v_sub.promotional_grant, false),
    'features', v_sub.plan_features
  );
END;
$$;

-- 5. Database-Level Trigger for Concurrency-Safe Listing Limit Enforcement
CREATE OR REPLACE FUNCTION public.check_seller_product_listing_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entitlements jsonb;
  v_can_create boolean;
  v_max_listings integer;
  v_current_count integer;
  v_plan_name text;
  v_is_unlimited boolean;
BEGIN
  -- Only check when product is in active state (draft, pending_review, approved)
  IF NEW.moderation_status IN ('archived', 'rejected') THEN
    RETURN NEW;
  END IF;

  -- If updating an already-active product without changing moderation status or seller, allow
  IF TG_OP = 'UPDATE' THEN
    IF OLD.moderation_status NOT IN ('archived', 'rejected') AND OLD.seller_id = NEW.seller_id THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Acquire transactional lock on seller to serialize concurrent insertions
  PERFORM pg_advisory_xact_lock(hashtext('product_limit_' || NEW.seller_id::text));

  -- Query entitlements
  v_entitlements := public.get_seller_subscription_entitlements(NEW.seller_id);
  v_can_create := (v_entitlements ->> 'can_create_listing')::boolean;
  v_is_unlimited := (v_entitlements ->> 'is_unlimited')::boolean;

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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_check_seller_product_listing_limit ON public.products;
CREATE TRIGGER trg_check_seller_product_listing_limit
  BEFORE INSERT OR UPDATE OF moderation_status, seller_id
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_seller_product_listing_limit();

-- 6. Automatic Enrollment Trigger on Seller Creation
CREATE OR REPLACE FUNCTION public.enroll_seller_free_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_free_plan_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT id INTO v_free_plan_id FROM public.subscription_plans WHERE code = 'free';
  IF v_free_plan_id IS NOT NULL THEN
    INSERT INTO public.seller_subscriptions (seller_id, plan_id, status, billing_cycle)
    VALUES (NEW.id, v_free_plan_id, 'active', 'lifetime')
    ON CONFLICT (seller_id) WHERE status IN ('active', 'trialing', 'past_due') DO NOTHING
    RETURNING id INTO v_sub_id;

    IF v_sub_id IS NOT NULL THEN
      INSERT INTO public.subscription_events (subscription_id, seller_id, event_type, new_plan_id, triggered_by, notes)
      VALUES (v_sub_id, NEW.id, 'created', v_free_plan_id, 'system', 'Automatic initial Free plan enrollment');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enroll_seller_free_subscription ON public.seller_profiles;
CREATE TRIGGER trg_enroll_seller_free_subscription
  AFTER INSERT ON public.seller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enroll_seller_free_subscription();

-- Backfill any existing seller profiles without an active subscription
DO $$
DECLARE
  r record;
  v_free_plan_id uuid;
  v_sub_id uuid;
BEGIN
  SELECT id INTO v_free_plan_id FROM public.subscription_plans WHERE code = 'free';
  IF v_free_plan_id IS NOT NULL THEN
    FOR r IN (
      SELECT s.id FROM public.seller_profiles s
      LEFT JOIN public.seller_subscriptions sub ON sub.seller_id = s.id AND sub.status IN ('active', 'trialing', 'past_due')
      WHERE sub.id IS NULL
    ) LOOP
      INSERT INTO public.seller_subscriptions (seller_id, plan_id, status, billing_cycle)
      VALUES (r.id, v_free_plan_id, 'active', 'lifetime')
      ON CONFLICT (seller_id) WHERE status IN ('active', 'trialing', 'past_due') DO NOTHING
      RETURNING id INTO v_sub_id;

      IF v_sub_id IS NOT NULL THEN
        INSERT INTO public.subscription_events (subscription_id, seller_id, event_type, new_plan_id, triggered_by, notes)
        VALUES (v_sub_id, r.id, 'created', v_free_plan_id, 'system', 'Backfilled initial Free plan enrollment');
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- 7. Admin Plan Change / Promotional Grant RPC
CREATE OR REPLACE FUNCTION public.admin_modify_seller_subscription(
  _seller_id            uuid,
  _target_plan_code     text,
  _reason               text,
  _is_promotional       boolean DEFAULT false,
  _custom_max_listings  integer DEFAULT NULL,
  _period_days          integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_target_plan record;
  v_existing_sub record;
  v_new_sub_id uuid;
  v_period_end timestamptz := NULL;
  v_event_type text;
BEGIN
  -- Strict server-side admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can modify seller subscriptions.'
      USING ERRCODE = '42501';
  END IF;

  -- Validate target plan
  SELECT * INTO v_target_plan FROM public.subscription_plans WHERE code = _target_plan_code;
  IF v_target_plan.id IS NULL THEN
    RAISE EXCEPTION 'Target plan with code "%" does not exist.', _target_plan_code
      USING ERRCODE = 'P0002';
  END IF;

  -- Validate period
  IF _period_days IS NOT NULL AND _period_days > 0 THEN
    v_period_end := now() + (_period_days || ' days')::interval;
  END IF;

  -- Find existing active subscription
  SELECT * INTO v_existing_sub
  FROM public.seller_subscriptions
  WHERE seller_id = _seller_id
    AND status IN ('active', 'trialing', 'past_due')
  LIMIT 1;

  -- Determine event type
  IF _is_promotional THEN
    v_event_type := 'grant_added';
  ELSIF v_existing_sub.id IS NOT NULL THEN
    v_event_type := 'plan_changed';
  ELSE
    v_event_type := 'created';
  END IF;

  -- Retire existing subscription if present
  IF v_existing_sub.id IS NOT NULL THEN
    UPDATE public.seller_subscriptions
    SET status = 'canceled',
        canceled_at = now(),
        updated_at = now()
    WHERE id = v_existing_sub.id;
  END IF;

  -- Insert new active subscription
  INSERT INTO public.seller_subscriptions (
    seller_id,
    plan_id,
    status,
    billing_cycle,
    started_at,
    current_period_start,
    current_period_end,
    promotional_grant,
    granted_by,
    grant_reason,
    custom_max_listings
  ) VALUES (
    _seller_id,
    v_target_plan.id,
    'active',
    CASE WHEN v_period_end IS NULL THEN 'lifetime' ELSE 'monthly' END,
    now(),
    now(),
    v_period_end,
    _is_promotional,
    v_admin_id,
    _reason,
    _custom_max_listings
  )
  RETURNING id INTO v_new_sub_id;

  -- Log immutable subscription event
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
  ) VALUES (
    v_new_sub_id,
    _seller_id,
    v_event_type,
    v_existing_sub.plan_id,
    v_target_plan.id,
    'admin',
    v_admin_id,
    _reason,
    jsonb_build_object(
      'is_promotional', _is_promotional,
      'custom_max_listings', _custom_max_listings,
      'period_days', _period_days
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_new_sub_id,
    'seller_id', _seller_id,
    'plan_code', v_target_plan.code,
    'plan_name', v_target_plan.name,
    'promotional_grant', _is_promotional
  );
END;
$$;

-- 8. Row Level Security Policies
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- subscription_plans RLS:
CREATE POLICY subscription_plans_select_all ON public.subscription_plans
  FOR SELECT TO authenticated, anon
  USING (is_active = true OR public.is_admin());

CREATE POLICY subscription_plans_admin_manage ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- seller_subscriptions RLS:
CREATE POLICY seller_subscriptions_select ON public.seller_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_seller_owner(seller_id) OR public.is_admin());

CREATE POLICY seller_subscriptions_admin_manage ON public.seller_subscriptions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- subscription_events RLS:
CREATE POLICY subscription_events_select ON public.subscription_events
  FOR SELECT TO authenticated
  USING (public.is_seller_owner(seller_id) OR public.is_admin());

CREATE POLICY subscription_events_admin_manage ON public.subscription_events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. Grants and Permissions
GRANT SELECT ON public.subscription_plans TO authenticated, anon;
GRANT SELECT ON public.seller_subscriptions TO authenticated;
GRANT SELECT ON public.subscription_events TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_seller_subscription_entitlements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_modify_seller_subscription(uuid, text, text, boolean, integer, integer) TO authenticated;

