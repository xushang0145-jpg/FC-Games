-- Supabase 迁移：运营仪表盘服务端聚合
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 用途：将原本在浏览器端对 events 全表聚合的逻辑下沉到 PostgreSQL，避免随着事件表增长产生性能瓶颈。

-- 1. KPI 汇总（页面浏览、游戏启动、总游戏时长、独立访客）
CREATE OR REPLACE FUNCTION get_dashboard_kpi_summary(
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_pages BIGINT,
  total_starts BIGINT,
  total_duration_minutes BIGINT,
  uv BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_pages,
    COUNT(*) FILTER (WHERE event_type = 'game_start') AS total_starts,
    COALESCE(SUM(duration_seconds) FILTER (WHERE event_type = 'game_duration'), 0) / 60 AS total_duration_minutes,
    COUNT(DISTINCT user_id) AS uv
  FROM events
  WHERE (start_time IS NULL OR client_timestamp >= start_time)
    AND (end_time IS NULL OR client_timestamp <= end_time);
$$;

-- 2. 页面浏览排行
CREATE OR REPLACE FUNCTION get_dashboard_page_view_stats(
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  path TEXT,
  count BIGINT,
  percent INT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH stats AS (
    SELECT
      page_path AS path,
      COUNT(*) AS count
    FROM events
    WHERE event_type = 'page_view'
      AND (start_time IS NULL OR client_timestamp >= start_time)
      AND (end_time IS NULL OR client_timestamp <= end_time)
    GROUP BY page_path
  ),
  total AS (
    SELECT COALESCE(NULLIF(SUM(count), 0), 1) AS value FROM stats
  )
  SELECT
    s.path,
    s.count,
    ROUND(s.count * 100.0 / t.value)::INT AS percent
  FROM stats s, total t
  ORDER BY s.count DESC;
$$;

-- 3. 游戏数据排行
CREATE OR REPLACE FUNCTION get_dashboard_game_stats(
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  name TEXT,
  start_count BIGINT,
  total_duration_minutes BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    game_name AS name,
    COUNT(*) FILTER (WHERE event_type = 'game_start') AS start_count,
    COALESCE(SUM(duration_seconds) FILTER (WHERE event_type = 'game_duration'), 0) / 60 AS total_duration_minutes
  FROM events
  WHERE game_name IS NOT NULL
    AND event_type IN ('game_start', 'game_duration')
    AND (start_time IS NULL OR client_timestamp >= start_time)
    AND (end_time IS NULL OR client_timestamp <= end_time)
  GROUP BY game_name
  ORDER BY start_count DESC;
$$;

-- 4. 终端类型分布
CREATE OR REPLACE FUNCTION get_dashboard_device_stats(
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  type TEXT,
  count BIGINT,
  percent INT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH stats AS (
    SELECT
      COALESCE(device_type, 'unknown') AS type,
      COUNT(*) AS count
    FROM events
    WHERE event_type = 'page_view'
      AND (start_time IS NULL OR client_timestamp >= start_time)
      AND (end_time IS NULL OR client_timestamp <= end_time)
    GROUP BY COALESCE(device_type, 'unknown')
  ),
  total AS (
    SELECT COALESCE(NULLIF(SUM(count), 0), 1) AS value FROM stats
  )
  SELECT
    s.type,
    s.count,
    ROUND(s.count * 100.0 / t.value)::INT AS percent
  FROM stats s, total t
  ORDER BY s.count DESC;
$$;

-- 5. Top 10 访问城市
CREATE OR REPLACE FUNCTION get_dashboard_city_stats(
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  city TEXT,
  count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    TRIM(BOTH ' ' FROM city || ', ' || COALESCE(country, '')) AS city,
    COUNT(*) AS count
  FROM events
  WHERE event_type = 'page_view'
    AND city IS NOT NULL
    AND (start_time IS NULL OR client_timestamp >= start_time)
    AND (end_time IS NULL OR client_timestamp <= end_time)
  GROUP BY city, country
  ORDER BY count DESC
  LIMIT 10;
$$;

-- 6. 为聚合查询补充复合索引（如不存在则创建）
CREATE INDEX IF NOT EXISTS idx_events_type_game_timestamp
  ON events(event_type, game_name, client_timestamp)
  WHERE event_type IN ('game_start', 'game_duration');
