-- ═══════════════════════════════════════════════════════════════════════════
-- AI Coach: user_study_profiles table
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_study_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_focus_hours INTEGER NOT NULL DEFAULT 3,
  peak_time TEXT NOT NULL DEFAULT 'morning',      -- morning | afternoon | evening | night
  focus_level TEXT NOT NULL DEFAULT 'intermediate', -- beginner | intermediate | advanced
  study_style TEXT NOT NULL DEFAULT 'structured',   -- structured | flexible | intensive
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_study_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "Users can read own profile" 
  ON user_study_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON user_study_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON user_study_profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_study_profiles_updated_at
  BEFORE UPDATE ON user_study_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- AI Coach: coach_conversations table (persistent chat memory)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS coach_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_coach_conversations_user_id ON coach_conversations(user_id, created_at DESC);

-- RLS
ALTER TABLE coach_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON coach_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON coach_conversations FOR DELETE
  USING (auth.uid() = user_id);
