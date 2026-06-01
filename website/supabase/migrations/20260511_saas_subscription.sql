-- =====================================================
-- AntiDistract SaaS — Cleanup & Polar Migration
-- Run this in Supabase → SQL Editor
-- Safe to re-run (idempotent)
-- =====================================================

-- 1. Drop Stripe columns (no longer needed, using Polar)
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_subscription_id;

-- 2. Drop Stripe index
DROP INDEX IF EXISTS idx_profiles_stripe_customer;

-- 3. Fix subscription_tier constraint: 'premium' → 'pro'
--    (our code uses 'free' | 'pro', not 'premium')
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier = ANY (ARRAY['free'::text, 'pro'::text]));

-- 4. Migrate any existing 'premium' rows → 'pro'
UPDATE profiles SET subscription_tier = 'pro' WHERE subscription_tier = 'premium';

-- 5. Ensure polar_customer_id index exists (column already in table)
CREATE INDEX IF NOT EXISTS idx_profiles_polar_customer_id
  ON public.profiles USING btree (polar_customer_id);

-- ── SQL FUNCTIONS ─────────────────────────────────────────────────────────

-- 6. Function: auto-reset daily_scans_used when a new day starts
CREATE OR REPLACE FUNCTION reset_daily_scans_if_needed(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET
    daily_scans_used = 0,
    last_reset_date = CURRENT_DATE
  WHERE
    id = p_user_id
    AND last_reset_date < CURRENT_DATE;
END;
$$;

-- 7. Function: atomically increment scan count and return usage + limit
--    Returns: (scans_used, scan_limit, tier, allowed)
CREATE OR REPLACE FUNCTION increment_scan_and_check(p_user_id UUID)
RETURNS TABLE(
  scans_used INTEGER,
  scan_limit INTEGER,
  tier TEXT,
  allowed BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tier TEXT;
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  -- Auto-reset if new day
  PERFORM reset_daily_scans_if_needed(p_user_id);

  -- Get current state
  SELECT subscription_tier, daily_scans_used
  INTO v_tier, v_used
  FROM profiles
  WHERE id = p_user_id;

  -- Determine limit based on tier
  v_limit := CASE WHEN v_tier = 'pro' THEN 200 ELSE 10 END;

  -- Only increment if under limit
  IF v_used < v_limit THEN
    UPDATE profiles
    SET daily_scans_used = daily_scans_used + 1
    WHERE id = p_user_id
    RETURNING daily_scans_used INTO v_used;
  END IF;

  RETURN QUERY SELECT v_used, v_limit, v_tier, (v_used <= v_limit);
END;
$$;

-- ── RLS POLICIES ─────────────────────────────────────────────────────────

-- 8. Enable RLS (safe if already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop first so script is safe to re-run
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Prevent users from passing arbitrary subscription tiers. 
    -- The webhook (Service Role) bypasses RLS and can update everything.
    auth.uid() = id
  );

-- Additionally, to prevent users from updating specific columns during their normal UPDATE operations,
-- we restrict the UPDATE permission on the table so they can only update certain columns like 'display_name' 
-- if they use the standard Anon Key. However, a simpler approach is a security trigger or just letting the Edge Function upgrade them.
-- To be safe, we will just use a trigger to prevent modifying billing columns unless it's a superuser/service role!
-- 
-- Let's define a trigger function to block modifying subscription_tier by normal users:
CREATE OR REPLACE FUNCTION block_billing_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'anon' OR current_setting('request.jwt.claims', true)::jsonb->>'role' = 'authenticated' THEN
    IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier OR NEW.polar_customer_id IS DISTINCT FROM OLD.polar_customer_id THEN
      RAISE EXCEPTION 'You cannot modify billing status directly.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_billing_security ON profiles;
CREATE TRIGGER enforce_billing_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION block_billing_updates();
