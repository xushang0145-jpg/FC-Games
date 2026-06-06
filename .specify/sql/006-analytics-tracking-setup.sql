-- Supabase 初始化 SQL: 006-analytics-tracking
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 1. 创建 events 表
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('page_view', 'game_start', 'game_duration')),
  page_path TEXT,
  game_name TEXT,
  session_id UUID NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  duration_seconds INT CHECK (duration_seconds <= 1800),
  device_type VARCHAR(10) CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  country TEXT,
  province TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 创建索引
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(client_timestamp);
CREATE INDEX idx_events_game ON events(game_name) WHERE event_type IN ('game_start', 'game_duration');
CREATE INDEX idx_events_type_timestamp ON events(event_type, client_timestamp);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_device ON events(device_type) WHERE device_type IS NOT NULL;
CREATE INDEX idx_events_city ON events(city) WHERE city IS NOT NULL;

-- 3. 启用 RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 4. 创建 RLS 策略
CREATE POLICY "Allow anonymous insert" ON events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select" ON events
  FOR SELECT TO anon USING (true);

-- 5. 启用 pg_cron 并创建定时清理任务
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-old-events',
  '0 0 * * *',
  $$ DELETE FROM events WHERE client_timestamp < NOW() - INTERVAL '90 days' $$
);
