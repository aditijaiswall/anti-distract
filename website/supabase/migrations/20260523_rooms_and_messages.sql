-- ============================================================
-- Focus Rooms & Room Messages — Schema + RLS + Realtime
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Create rooms table if missing
CREATE TABLE IF NOT EXISTS rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Focus Room',
  timer_duration INT DEFAULT 1500,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create room_messages table if missing
CREATE TABLE IF NOT EXISTS room_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_name TEXT DEFAULT 'Anonymous',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Force add columns if table existed prior to schema update
ALTER TABLE room_messages ADD COLUMN IF NOT EXISTS sender_name TEXT DEFAULT 'Anonymous';

-- 3. Enable RLS on both tables
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for rooms
-- Anyone authenticated can view active rooms (needed for joining by code)
DROP POLICY IF EXISTS "Authenticated users can view active rooms" ON rooms;
CREATE POLICY "Authenticated users can view active rooms"
  ON rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user can create a room
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON rooms;
CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Host can update their own room (e.g. end it)
DROP POLICY IF EXISTS "Host can update own room" ON rooms;
CREATE POLICY "Host can update own room"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Host can delete own room
DROP POLICY IF EXISTS "Host can delete own room" ON rooms;
CREATE POLICY "Host can delete own room"
  ON rooms FOR DELETE
  USING (auth.uid() = host_id);

-- 5. RLS Policies for room_messages
-- Anyone in the system can read messages (needed for room participants)
DROP POLICY IF EXISTS "Authenticated users can read room messages" ON room_messages;
CREATE POLICY "Authenticated users can read room messages"
  ON room_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can send messages
DROP POLICY IF EXISTS "Authenticated users can send messages" ON room_messages;
CREATE POLICY "Authenticated users can send messages"
  ON room_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
DROP POLICY IF EXISTS "Users can delete own messages" ON room_messages;
CREATE POLICY "Users can delete own messages"
  ON room_messages FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Enable Realtime for room_messages so chat updates are live
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 7. Index for fast message queries by room
CREATE INDEX IF NOT EXISTS idx_room_messages_room_id ON room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
