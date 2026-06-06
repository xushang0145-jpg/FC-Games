# Contract: Supabase API

**Feature**: 006-analytics-tracking
**Type**: 前端 ↔ Supabase 直接交互

---

## 接口概览

前端通过 `@supabase/supabase-js` 客户端直接与 Supabase 交互。所有接口均为匿名访问（anon key），通过 RLS 策略控制权限。

---

## Insert Event（插入单条事件）

**Method**: `supabase.from('events').insert(event)`

**Request**:
```javascript
{
  event_type: 'page_view' | 'game_start' | 'game_duration',
  page_path?: string,      // page_view 必填
  game_name?: string,      // game_start / game_duration 必填
  session_id: string,      // UUID
  client_timestamp: string, // ISO 8601, e.g. "2026-06-06T12:00:00.000Z"
  duration_seconds?: number // game_duration 必填，最大 1800
}
```

**Success Response**:
```javascript
{ data: [{ id: 'uuid', ... }], error: null }
```

**Error Response**:
```javascript
{ data: null, error: { message: '...', code: '...' } }
```

**行为**:
- 发送失败时（网络错误、Supabase 不可用），事件存入 localStorage 暂存队列
- 不阻塞主线程，使用 `.then()` 处理结果，不 `await`

---

## Insert Batch Events（批量插入事件）

**Method**: `supabase.from('events').insert(eventsArray)`

**Request**:
```javascript
[
  { event_type: 'page_view', page_path: '/', session_id: '...', client_timestamp: '...' },
  { event_type: 'game_start', game_name: '超级玛莉', session_id: '...', client_timestamp: '...' },
  // ... 最多 100 条
]
```

**Success Response**:
```javascript
{ data: [...], error: null }
```

**行为**:
- 页面加载时检查 localStorage 暂存队列
- 有数据时批量插入，成功后清空 localStorage 队列
- 批量插入仍失败则保留队列，下次页面加载重试

---

## Query Page View Stats（查询页面浏览统计）

**Method**: `supabase.rpc('get_page_view_stats', { start_date, end_date })`

或直接使用 SQL:

**Method**: `supabase.from('events').select('page_path, count').eq('event_type', 'page_view').gte('client_timestamp', start).lte('client_timestamp', end).group('page_path')`

**Request Parameters**:
```javascript
{
  start: string, // ISO 8601, 时间范围起始
  end: string    // ISO 8601, 时间范围结束（可选，默认 NOW）
}
```

**Response**:
```javascript
{
  data: [
    { page_path: '/', count: 42 },
    { page_path: '/game', count: 15 }
  ],
  error: null
}
```

---

## Query Game Stats（查询游戏统计）

**Method**: `supabase.rpc('get_game_stats', { start_date, end_date })`

**Response**:
```javascript
{
  data: [
    { game_name: '超级玛莉', start_count: 10, total_duration_seconds: 1800 },
    { game_name: '魂斗罗', start_count: 5, total_duration_seconds: 900 }
  ],
  error: null
}
```

---

## Query Raw Events（查询原始事件——数据导出）

**Method**: `supabase.from('events').select('*').gte('client_timestamp', start).lte('client_timestamp', end).order('client_timestamp', { ascending: false })`

**Response**:
```javascript
{
  data: [
    { id: '...', event_type: '...', ... },
    // ...
  ],
  error: null
}
```

**注意**: 大量数据时使用分页（`range()`）。

---

## Supabase Client 初始化

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**环境变量**:
- `VITE_SUPABASE_URL`: Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
