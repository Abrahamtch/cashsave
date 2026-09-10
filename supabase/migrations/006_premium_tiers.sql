-- ============================================
-- Cash Save — Migration 006: Premium Tiers
-- ============================================

-- Add premium tier columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_premium_date TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_months_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_7d_used BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_7d_start TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_days_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_trial_prompt_day INTEGER DEFAULT 0;

-- Reset all existing users to free tier
UPDATE profiles SET is_premium = FALSE, premium_expires_at = NULL WHERE is_premium = TRUE;
