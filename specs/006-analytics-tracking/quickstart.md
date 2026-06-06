# Quickstart: 埋点数据统计验证指南

**Feature**: 006-analytics-tracking

---

## Prerequisites

1. Supabase 项目已创建，表结构已初始化（见 [data-model.md](./data-model.md)）
2. 环境变量已配置：
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. 本地开发服务器运行中：`npm run dev`

---

## P1 验证：页面浏览追踪

### 场景 1：首页浏览事件

**步骤**:
1. 打开浏览器访问 `http://localhost:5173/`
2. 打开浏览器开发者工具 → Network 标签
3. 观察是否有对 Supabase 的 `POST` 请求（`/rest/v1/events`）
4. 检查请求体包含：`event_type: "page_view"`, `page_path: "/"`

**预期结果**:
- 请求状态 201 Created
- Supabase Dashboard → Table Editor → `events` 表中新增一条 `page_view` 记录

### 场景 2：游戏页浏览事件

**步骤**:
1. 在首页点击任意游戏卡片，进入游戏页
2. 观察 Network 中的 Supabase 请求

**预期结果**:
- 新增 `page_view` 记录，`page_path` 为 `/game` 或包含游戏名称的路径

### 场景 3：刷新累加

**步骤**:
1. 刷新首页 3 次
2. 检查 Supabase `events` 表中 `page_path = "/"` 的记录数

**预期结果**:
- 记录数 = 3（每次刷新产生独立事件，不同 `session_id`）

---

## P1 验证：游戏交互追踪

### 场景 4：游戏启动事件

**步骤**:
1. 进入游戏页
2. 点击"投币"按钮，再点击"开始"按钮
3. 观察 Network 中的 Supabase 请求

**预期结果**:
- 点击"开始"后发送 `game_start` 事件
- `game_name` 字段正确填充游戏名称

### 场景 5：游戏时长记录

**步骤**:
1. 启动游戏（点击"开始"）
2. 游玩约 30 秒后，点击"返回列表"按钮
3. 观察 Network 中的 Supabase 请求

**预期结果**:
- 返回列表时发送 `game_duration` 事件
- `duration_seconds` 约等于 30（允许 ±2 秒误差）

### 场景 6：多次启动累加

**步骤**:
1. 对同一款游戏重复"启动 → 返回"3 次
2. 在 Supabase Dashboard 中查询该游戏的统计

**预期结果**:
- `game_start` 事件数 = 3
- `game_duration` 总时长 ≈ 3 次游玩时长之和

---

## P1 验证：网络降级

### 场景 7：离线暂存

**步骤**:
1. 打开浏览器开发者工具 → Network → 勾选"Offline"
2. 刷新首页
3. 检查 Application → Local Storage → `fc_analytics_queue`

**预期结果**:
- Supabase 请求失败（红色）
- localStorage 中 `fc_analytics_queue` 有数据

### 场景 8：恢复上报

**步骤**:
1. 取消"Offline"勾选（恢复网络）
2. 刷新首页
3. 检查 localStorage 队列是否清空
4. 检查 Supabase 表中是否有之前离线时的事件

**预期结果**:
- 页面加载时自动上报暂存数据
- localStorage 队列清空
- Supabase 表中包含离线期间的事件

---

## P2 验证：统计仪表盘

### 场景 9：仪表盘数据展示

**步骤**:
1. 确保已产生若干浏览和游戏数据（执行上述 P1 场景）
2. 访问 `http://localhost:5173/stats.html`
3. 观察页面展示

**预期结果**:
- 页面展示各页面的总浏览次数
- 展示各游戏的启动次数和总游玩时长
- 数据与 Supabase 中的原始记录一致

### 场景 10：时间筛选

**步骤**:
1. 在统计页面点击"今日"/"本周"/"本月"/"全部"筛选按钮
2. 观察数据变化

**预期结果**:
- "今日"只展示当天产生的事件统计
- "本周"只展示本周一至今的数据
- "全部"展示所有历史数据

### 场景 11：空状态

**步骤**:
1. 清空 Supabase `events` 表（`TRUNCATE events;`）
2. 刷新统计页面

**预期结果**:
- 页面展示友好的空状态提示（如"暂无数据"）
- 不出现空白或错误

---

## P3 验证：数据导出

### 场景 12：导出 JSON

**步骤**:
1. 确保有数据产生
2. 在统计页面点击"导出数据"按钮
3. 检查下载的文件

**预期结果**:
- 下载一个 `.json` 文件
- 文件内容包含所有原始事件数据（与 Supabase 查询结果一致）

### 场景 13：按时间范围导出

**步骤**:
1. 选择"今日"筛选
2. 点击"导出数据"按钮

**预期结果**:
- 文件中只包含今日的事件数据

---

## 性能验证

### 场景 14：60 fps 不受影响

**步骤**:
1. 打开游戏页
2. 打开浏览器开发者工具 → Performance
3. 录制 10 秒游戏运行（包含埋点发送）
4. 观察帧率

**预期结果**:
- 帧率稳定在 60 fps（波动不超过 1 fps）
- 埋点发送不造成可见卡顿

### 场景 15：仪表盘加载速度

**步骤**:
1. 向 Supabase 插入 1000 条测试事件数据
2. 访问统计页面
3. 观察加载时间

**预期结果**:
- 从打开页面到数据展示完成 ≤ 2 秒
