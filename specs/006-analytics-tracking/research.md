# Research: 埋点数据统计 — 技术决策记录

**Feature**: 006-analytics-tracking
**Date**: 2026-06-06

---

## Decision: 使用 Supabase 作为埋点数据主存储

**Rationale**:
- 用户在 clarify 阶段明确要求从纯 localStorage 改为 Supabase
- 解决 localStorage 5MB 容量限制问题
- 支持跨设备数据聚合（运营者可在任意设备查看统计仪表盘）
- Supabase 提供免费的 PostgreSQL 托管，与项目已有的 Vercel 部署无冲突

**Alternatives considered**:
- 纯 localStorage（原始方案）：容量受限，无法跨设备
- Vercel Postgres（Vercel Marketplace）：需要额外配置，Supabase 更成熟且免费层更友好
- 自建后端 API：过重，不符合 YAGNI

---

## Decision: 统一 events 表存储所有事件类型

**Rationale**:
- 埋点事件结构相似（都有 timestamp、session_id）
- 统一表简化查询（一条 SQL 可按 event_type 聚合）
- 减少表数量，降低维护成本

**Schema**:
```sql
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('page_view', 'game_start', 'game_duration')),
  page_path TEXT,
  game_name TEXT,
  session_id UUID NOT NULL,
  client_timestamp TIMESTAMPTZ NOT NULL,
  duration_seconds INT CHECK (duration_seconds <= 1800),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Alternatives considered**:
- 分表（page_views / game_starts / game_durations）：查询更复杂，需要 JOIN
- JSONB 灵活字段：过度灵活，失去类型安全

---

## Decision: 使用 Supabase anon key + RLS 策略实现匿名写入

**Rationale**:
- 项目没有用户认证系统，无法使用 auth user
- anon key 可以安全地暴露在前端（只授予 INSERT/SELECT 权限）
- RLS 策略限制操作范围，防止恶意篡改

**RLS 策略**:
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 允许匿名插入（任何人可上报事件）
CREATE POLICY "Allow anonymous insert" ON events
  FOR INSERT TO anon WITH CHECK (true);

-- 允许匿名查询（统计仪表盘需要读取）
CREATE POLICY "Allow anonymous select" ON events
  FOR SELECT TO anon USING (true);
```

**Risk**: 任何人都可以插入假数据。Mitigation：对于项目当前规模可接受；后续可通过 rate limiting 或 API 层验证缓解。

**Alternatives considered**:
- Vercel Edge Function 代理：更安全（隐藏 service_role key），但增加了后端复杂度和调用延迟
- 自建 API 层：过重，不符合 YAGNI

---

## Decision: 前端直接批量插入 Supabase，不使用后端代理

**Rationale**:
- 减少架构层级，降低延迟
- Supabase JS 客户端支持批量插入（`supabase.from('events').insert([...])`）
- 网络失败时降级到 localStorage，下次页面加载时批量上报

**上报流程**:
1. 事件发生时 → 立即尝试 `insert` 到 Supabase
2. 失败（网络中断）→ 存入 localStorage 暂存队列
3. 下次页面加载 → 检查 localStorage 队列，批量 `insert` 后清空队列

**Alternatives considered**:
- 每个事件独立请求：过多 HTTP 请求，性能差
- 服务端聚合 API：需要后端，过重

---

## Decision: 统计查询在 Supabase 端通过 SQL 聚合

**Rationale**:
- PostgreSQL 的聚合函数（COUNT, SUM）性能优异
- 减少前端计算量，避免传输大量原始数据
- 利用数据库索引保证查询速度

**关键查询模式**:
```sql
-- 页面浏览次数（按时间范围）
SELECT page_path, COUNT(*) 
FROM events 
WHERE event_type = 'page_view' 
  AND client_timestamp BETWEEN $1 AND $2
GROUP BY page_path;

-- 游戏启动次数和总时长
SELECT game_name, 
       COUNT(*) FILTER (WHERE event_type = 'game_start') AS start_count,
       COALESCE(SUM(duration_seconds) FILTER (WHERE event_type = 'game_duration'), 0) AS total_duration
FROM events 
WHERE client_timestamp BETWEEN $1 AND $2
GROUP BY game_name;
```

---

## Decision: 时间筛选边界定义

**Rationale**: 在 clarify 阶段标记为 deferred，现补充定义。

| 筛选项 | 时间范围 |
| --- | --- |
| 今日 | 当天 00:00:00 至当前时间 |
| 本周 | 本周一 00:00:00 至当前时间 |
| 本月 | 本月 1 日 00:00:00 至当前时间 |
| 全部 | 所有时间（无上界） |

**实现**: 前端计算时间边界，作为查询参数传递给 Supabase。

---

## Decision: 90 天数据保留策略

**Rationale**:
- spec 要求事件数据保留最近 90 天
- Supabase 不支持自动 TTL，需通过 cron job 或手动清理

**实现方案**:
- 选项 A：Supabase 内置 cron 扩展（`pg_cron`）定时删除超期数据
- 选项 B：统计仪表盘页面加载时检查并触发清理（不推荐，增加页面加载时间）
- 选项 C：手动执行 SQL 清理

**选定**: 选项 A（pg_cron），在 Supabase Dashboard 中配置定时任务：
```sql
SELECT cron.schedule('cleanup-old-events', '0 0 * * *',
  $ DELETE FROM events WHERE client_timestamp < NOW() - INTERVAL '90 days' $);
```

---

## Decision: 无自建后端架构

**Rationale**:
- 项目处于早期阶段，YAGNI 原则优先
- 当前风险可控：RLS 策略限制操作范围，小流量场景下 anon key 暴露可接受
- 前端直连 Supabase 延迟最低（无中间层跳转）
- 后续如需后端（安全防护、rate limiting、复杂聚合），可无缝迁移到 Vercel Function

**架构图**:
```
[用户浏览器] ←──anon key──→ [Supabase PostgreSQL]
     ↓
[ipapi.co]  (IP 定位，第三方 API)
```

**数据流**:
1. 事件发生时 → 前端直接 `supabase.from('events').insert()`
2. 统计查询时 → 前端直接 `supabase.from('events').select()`
3. 数据清理 → Supabase `pg_cron` 定时任务

**Alternatives considered**:
- Vercel Function 代理：更安全（隐藏 service_role key），但增加延迟和复杂度
- 自建后端 API：过重，不符合当前阶段需求

---

## Decision: 匿名用户标识（user_id）

**Rationale**:
- 项目没有用户登录系统，但需要区分不同用户以统计独立访客数（UV）
- 匿名设备 ID 是最轻量的方案，不引入认证复杂度
- UUID 存 localStorage，用户清除浏览器数据后重新生成（符合隐私预期）

**实现**:
```javascript
function getUserId() {
  let uid = localStorage.getItem('fc_user_id');
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem('fc_user_id', uid);
  }
  return uid;
}
```

**数据影响**:
- `events` 表增加 `user_id UUID NOT NULL` 字段
- 统计仪表盘可展示 UV（按 user_id 去重）
- 同一用户的多次访问可关联分析

**Alternatives considered**:
- 浏览器指纹（Canvas/WebGL 哈希）：更准确但复杂，有隐私争议
- IP 地址：不精确（NAT 共享、VPN 变化）
- 用户登录系统：过重，不符合 YAGNI
