-- =====================================================
-- Planner Tasks — RLS Policies & Realtime Publication
-- Run this in Supabase → SQL Editor
-- Safe to re-run (idempotent)
-- =====================================================

-- 1. Enable RLS (safe if already enabled)
ALTER TABLE planner_tasks ENABLE ROW LEVEL SECURITY;

-- 2. Drop and recreate policies (idempotent)
DROP POLICY IF EXISTS "Users can view own tasks" ON planner_tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON planner_tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON planner_tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON planner_tasks;

CREATE POLICY "Users can view own tasks"
  ON planner_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON planner_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON planner_tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON planner_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Enable Supabase Realtime for planner_tasks
-- This is REQUIRED for the postgres_changes subscription to work
ALTER PUBLICATION supabase_realtime ADD TABLE planner_tasks;
