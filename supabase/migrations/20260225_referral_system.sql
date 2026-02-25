-- ============================================================
-- Referral System Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add referral columns
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES user_profiles(id);

-- Prevent self-referral
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chk_no_self_referral'
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT chk_no_self_referral CHECK (referred_by IS DISTINCT FROM id);
  END IF;
END $$;

-- 2. Helper: generate a unique 8-char alphanumeric referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  taken BOOLEAN;
BEGIN
  LOOP
    -- Use gen_random_uuid stripped of dashes, take first 8 chars, uppercase
    code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE referral_code = code) INTO taken;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 3. Trigger: auto-generate referral_code for every new user profile
CREATE OR REPLACE FUNCTION trg_set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_insert_set_referral_code ON user_profiles;
CREATE TRIGGER before_insert_set_referral_code
  BEFORE INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION trg_set_referral_code();

-- 4. Populate referral codes for all existing users who don't have one
UPDATE user_profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- 5. apply_referral(p_new_user_id, p_ref_code)
--    • Idempotent: exits early if referred_by already set
--    • Prevents self-referral
--    • Adds 5 credits to both parties atomically
--    • SECURITY DEFINER so it can update any row regardless of RLS
CREATE OR REPLACE FUNCTION apply_referral(
  p_new_user_id UUID,
  p_ref_code    TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_referrer_id     UUID;
  v_already_referred BOOLEAN;
BEGIN
  -- Idempotency check: only proceed if this user has no referrer yet
  SELECT (referred_by IS NOT NULL)
  INTO   v_already_referred
  FROM   user_profiles
  WHERE  id = p_new_user_id;

  IF v_already_referred IS TRUE THEN
    RETURN FALSE;
  END IF;

  -- Find the referrer (must exist, must not be the new user)
  SELECT id
  INTO   v_referrer_id
  FROM   user_profiles
  WHERE  referral_code = p_ref_code
    AND  id != p_new_user_id;

  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Lock the referral (prevents race conditions / double-spend)
  UPDATE user_profiles
  SET    referred_by = v_referrer_id
  WHERE  id = p_new_user_id
    AND  referred_by IS NULL;   -- only if still not set (extra safety)

  -- Add 5 credits to new user
  UPDATE user_profiles
  SET    credits_remaining = credits_remaining + 5,
         updated_at        = now()
  WHERE  id = p_new_user_id;

  -- Add 5 credits to referrer
  UPDATE user_profiles
  SET    credits_remaining = credits_remaining + 5,
         updated_at        = now()
  WHERE  id = v_referrer_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
