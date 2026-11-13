-- Migration: Search Lead Capture
-- Purpose: Store IndiaMart-style search intent leads from the public marketplace.
-- Authenticated buyers: buyer_id is set.
-- Guest visitors: guest_name, guest_email, guest_phone are set.

CREATE TABLE IF NOT EXISTS public.search_leads (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  query       text        NOT NULL CHECK (char_length(query) BETWEEN 2 AND 500),
  buyer_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name  text        CHECK (char_length(guest_name) <= 200),
  guest_email text        CHECK (char_length(guest_email) <= 254),
  guest_phone text        CHECK (char_length(guest_phone) <= 20),
  source      text        NOT NULL DEFAULT 'search_bar', -- 'search_bar' | 'hero' | 'modal'
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_leads_buyer_id    ON public.search_leads (buyer_id);
CREATE INDEX IF NOT EXISTS idx_search_leads_created_at  ON public.search_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_leads_query_text  ON public.search_leads USING gin (to_tsvector('english', query));

-- Enable RLS
ALTER TABLE public.search_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated buyers can see their own leads
CREATE POLICY "Buyers can view own search leads"
  ON public.search_leads FOR SELECT
  TO authenticated
  USING (buyer_id = auth.uid());

-- Policy: Service role can do everything (for server-side inserts)
CREATE POLICY "Service role full access"
  ON public.search_leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can insert their own leads
CREATE POLICY "Authenticated insert search lead"
  ON public.search_leads FOR INSERT
  TO authenticated
  WITH CHECK (buyer_id = auth.uid() OR buyer_id IS NULL);

-- Policy: Anon can insert guest leads (name/phone/email, no buyer_id)
CREATE POLICY "Anon insert guest search lead"
  ON public.search_leads FOR INSERT
  TO anon
  WITH CHECK (buyer_id IS NULL);

-- Policy: Admins can read all leads
CREATE POLICY "Admins read all search leads"
  ON public.search_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
    )
  );

COMMENT ON TABLE public.search_leads IS
  'Captures product search intent from the public marketplace homepage and header. Used for lead generation and buyer demand analysis.';

