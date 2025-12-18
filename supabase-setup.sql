-- Supabase Database Setup for Heatmap App
-- Run this entire script in the Supabase SQL Editor

-- ============================================
-- 1. Create user_preferences table
-- ============================================
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opacity DECIMAL(3,2) NOT NULL DEFAULT 0.15 CHECK (opacity >= 0 AND opacity <= 1),
  radius INTEGER NOT NULL DEFAULT 10 CHECK (radius >= 5 AND radius <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 2. Create address_history table
-- ============================================
CREATE TABLE address_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  place_name TEXT NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  searched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, longitude, latitude)
);

-- ============================================
-- 3. Create indexes for performance
-- ============================================
CREATE INDEX idx_address_history_user_searched
  ON address_history(user_id, searched_at DESC);

-- ============================================
-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE address_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Create RLS Policies for user_preferences
-- ============================================
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. Create RLS Policies for address_history
-- ============================================
CREATE POLICY "Users can view own address history"
  ON address_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own address history"
  ON address_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own address history"
  ON address_history FOR DELETE
  USING (auth.uid() = user_id);
