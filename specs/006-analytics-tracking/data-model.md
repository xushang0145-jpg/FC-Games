# Data Model: 埋点数据统计

**Feature**: 006-analytics-tracking
**Storage**: Supabase PostgreSQL

---

## Entity: Event

统一事件表，存储所有埋点数据。

### Schema

```sql
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
```

### Fields

| Field | Type | Nullable | Description |
| --- | --- | --- | --- |
| `id` | UUID | No | 主键，自动生成 |
| `user_id` | UUID | No | 匿名用户标识，首次访问生成并持久化到 localStorage |
| `event_type` | VARCHAR(20) | No | 事件类型：`page_view` / `game_start` / `game_duration` |
| `page_path` | TEXT | Yes | 页面路径（`page_view` 事件必填） |
| `game_name` | TEXT | Yes | 游戏名称（`game_start` / `game_duration` 事件必填） |
| `session_id` | UUID | No | 会话标识，页面加载时生成 |
| `client_timestamp` | TIMESTAMPTZ | No | 事件发生的客户端时间 |
| `duration_seconds` | INT | Yes | 游玩时长秒数（仅 `game_duration` 事件） |
| `device_type` | VARCHAR(10) | Yes | 终端类型：`desktop` / `mobile` / `tablet` |
| `country` | TEXT | Yes | 国家（IP 定位获取） |
| `province` | TEXT | Yes | 省份/州（IP 定位获取） |
| `city` | TEXT | Yes | 城市（IP 定位获取） |
| `created_at` | TIMESTAMPTZ | No | 服务端写入时间，默认 NOW() |

### Validation Rules

- `event_type` 必须是三个枚举值之一
- `duration_seconds` 最大 1800（30 分钟），超出截断
- `page_path` 在 `page_view` 事件中必填
- `game_name` 在 `game_start` / `game_duration` 事件中必填

### Indexes

```sql
-- 按事件类型查询（统计仪表盘筛选）
CREATE INDEX idx_events_type ON events(event_type);

-- 按时间范围查询（时间筛选）
CREATE INDEX idx_events_timestamp ON events(client_timestamp);

-- 按游戏名称查询（游戏统计）
CREATE INDEX idx_events_game ON events(game_name) WHERE event_type IN ('game_start', 'game_duration');

-- 复合索引：事件类型 + 时间（最常用的查询模式）
CREATE INDEX idx_events_type_timestamp ON events(event_type, client_timestamp);

-- 按用户查询（去重统计 UV）
CREATE INDEX idx_events_user ON events(user_id);

-- 按终端类型查询（用户特征分析）
CREATE INDEX idx_events_device ON events(device_type) WHERE device_type IS NOT NULL;

-- 按城市查询（地域分布排行）
CREATE INDEX idx_events_city ON events(city) WHERE city IS NOT NULL;
```

### Row Level Security (RLS)

```sql
-- 启用 RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 允许匿名插入（任何人可上报事件）
CREATE POLICY "Allow anonymous insert" ON events
  FOR INSERT TO anon WITH CHECK (true);

-- 允许匿名查询（统计仪表盘需要读取）
CREATE POLICY "Allow anonymous select" ON events
  FOR SELECT TO anon USING (true);
```

**说明**: 当前不做用户认证，所有访问均为匿名。`anon` 角色只能 INSERT 和 SELECT，UPDATE 和 DELETE 无策略覆盖，因此默认拒绝。

---

## Entity: AggregatedStats（视图/查询结果）

这不是物理表，而是由 SQL 查询生成的统计视图。

### 页面浏览统计

```sql
SELECT 
  page_path,
  COUNT(*) AS view_count
FROM events
WHERE event_type = 'page_view'
  AND client_timestamp BETWEEN $start AND $end
GROUP BY page_path
ORDER BY view_count DESC;
```

### 游戏交互统计

```sql
SELECT
  game_name,
  COUNT(*) FILTER (WHERE event_type = 'game_start') AS start_count,
  COALESCE(SUM(duration_seconds) FILTER (WHERE event_type = 'game_duration'), 0) AS total_duration_seconds
FROM events
WHERE client_timestamp BETWEEN $start AND $end
  AND game_name IS NOT NULL
GROUP BY game_name
ORDER BY start_count DESC;
```

### 终端类型分布

```sql
SELECT
  COALESCE(device_type, 'unknown') AS device_type,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM events
WHERE client_timestamp BETWEEN $start AND $end
  AND event_type = 'page_view'
GROUP BY device_type
ORDER BY count DESC;
```

### Top 10 访问城市

```sql
SELECT
  city,
  country,
  COUNT(*) AS visit_count
FROM events
WHERE client_timestamp BETWEEN $start AND $end
  AND event_type = 'page_view'
  AND city IS NOT NULL
GROUP BY city, country
ORDER BY visit_count DESC
LIMIT 10;
```

---

## Data Retention

- **策略**: 事件数据保留最近 90 天
- **实现**: Supabase `pg_cron` 扩展定时清理
- **SQL**:

```sql
-- 启用 cron 扩展（在 Supabase Dashboard 中执行一次）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 创建每日清理任务
SELECT cron.schedule(
  'cleanup-old-events',
  '0 0 * * *',  -- 每天 UTC 00:00
  $ DELETE FROM events WHERE client_timestamp < NOW() - INTERVAL '90 days' $
);
```

---

## Event Lifecycle

```
[事件发生] → [立即尝试 Supabase insert]
    │                │
    │           [成功] → [结束]
    │                │
    │           [失败] → [存入 localStorage 暂存队列]
    │                           │
[下次页面加载] ← [批量上报] ←──┘
    │
[上报成功] → [清空 localStorage 队列]
```

### localStorage 降级存储格式

```javascript
 // Key: fc_analytics_queue
// Value: JSON 数组，最多 100 条
[
  {
    "event_type": "page_view",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "page_path": "/",
    "session_id": "...",
    "client_timestamp": "2026-06-06T12:00:00.000Z",
    "device_type": "desktop",
    "country": "中国",
    "province": "北京",
    "city": "北京"
  },
  // ... 最多 100 条
]
```
