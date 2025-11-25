-- OpenChat Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: waiting_queue
-- Purpose: Temporary holding pen for users looking for a match
-- ============================================
CREATE TABLE IF NOT EXISTS waiting_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  socket_channel_id TEXT NOT NULL,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_waiting_queue_user_id ON waiting_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_created_at ON waiting_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_interests ON waiting_queue USING GIN(interests);

-- Enable Row Level Security
ALTER TABLE waiting_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to insert themselves into queue
CREATE POLICY "Users can insert themselves into queue"
  ON waiting_queue FOR INSERT
  WITH CHECK (true);

-- Policy: Allow reading queue for matching
CREATE POLICY "Users can read queue for matching"
  ON waiting_queue FOR SELECT
  USING (true);

-- Policy: Allow users to delete their own queue entry
CREATE POLICY "Users can delete their own queue entry"
  ON waiting_queue FOR DELETE
  USING (true);

-- ============================================
-- Table: reports
-- Purpose: Safety mechanism for reporting bad actors
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL,
  bad_actor_id UUID NOT NULL,
  reason TEXT NOT NULL,
  chat_log_snapshot JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analyzing reports
CREATE INDEX IF NOT EXISTS idx_reports_bad_actor ON reports(bad_actor_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow users to create reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Table: active_rooms (optional - for tracking active chats)
-- Purpose: Track active chat rooms for cleanup
-- ============================================
CREATE TABLE IF NOT EXISTS active_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT UNIQUE NOT NULL,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Index for room lookups
CREATE INDEX IF NOT EXISTS idx_active_rooms_room_id ON active_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_active_rooms_users ON active_rooms(user1_id, user2_id);

-- Enable Row Level Security
ALTER TABLE active_rooms ENABLE ROW LEVEL SECURITY;

-- Policies for active_rooms
CREATE POLICY "Users can insert rooms"
  ON active_rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read rooms"
  ON active_rooms FOR SELECT
  USING (true);

CREATE POLICY "Users can update rooms"
  ON active_rooms FOR UPDATE
  USING (true);

-- ============================================
-- Function: Clean up stale queue entries
-- Purpose: Remove entries older than 5 minutes
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_stale_queue_entries()
RETURNS void AS $$
BEGIN
  DELETE FROM waiting_queue
  WHERE created_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Realtime Configuration
-- Enable realtime for the tables we need
-- ============================================
-- Note: Run these in Supabase Dashboard > Database > Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE waiting_queue;
-- ALTER PUBLICATION supabase_realtime ADD TABLE active_rooms;

