# Tasks: 埋点数据统计

**Input**: Design documents from `/specs/006-analytics-tracking/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: E2E 测试使用 @playwright/test，单元测试使用 vitest

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 安装依赖、配置环境、初始化 Supabase

- [x] T001 安装 `@supabase/supabase-js` 依赖：`npm install @supabase/supabase-js`
- [x] T002 [P] 配置 `.env.development` 和 `.env.production`，添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
- [x] T003 [P] 更新 `vite.config.js`，增加 `stats.html` 构建入口
- [x] T004 在 Supabase Dashboard 中创建 `events` 表（SQL 脚本已准备：`.specify/sql/006-analytics-tracking-setup.sql`）
- [x] T005 [P] 在 Supabase Dashboard 中创建 RLS 策略（同上 SQL 脚本）
- [x] T006 [P] 在 Supabase Dashboard 中创建索引（同上 SQL 脚本）
- [x] T007 [P] 在 Supabase Dashboard 中配置 `pg_cron` 定时清理任务（同上 SQL 脚本）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有用户故事共享的基础模块，必须先完成

**⚠️ CRITICAL**: 此阶段完成前，任何用户故事都不能开始实现

- [x] T008 [P] 创建 `src/shared/analytics.js` — Supabase 客户端初始化
- [x] T009 [P] 创建 `src/shared/user-id.js` — 匿名 `user_id` 生成与持久化（`localStorage`）
- [x] T010 [P] 创建 `src/shared/device.js` — 终端类型检测（`desktop` / `mobile` / `tablet`）
- [x] T011 [P] 创建 `src/shared/geo.js` — IP 地理位置获取（调用 `ipapi.co/json`，失败降级为空）
- [x] T012 创建 `src/shared/analytics-queue.js` — localStorage 暂存队列（上限 100 条，FIFO 淘汰）
- [x] T012a [P] 在 `src/shared/analytics.js` 中实现 `session_id` 生成逻辑 — 每次页面加载生成新 UUID
- [x] T013 [P] 创建 `tests/unit/analytics.test.js` — 单元测试：`user-id.js`、`device.js`、`geo.js`、`analytics-queue.js`、`session_id` 生成

**Checkpoint**: Foundation 就绪 — 所有共享模块可独立测试，Supabase 表结构就绪

---

## Phase 3: User Story 1 — 页面浏览追踪 (Priority: P1) 🎯 MVP

**Goal**: 每次页面加载自动记录页面浏览事件到 Supabase

**Independent Test**: 打开首页/游戏页，检查 Supabase `events` 表中出现 `event_type = 'page_view'` 的记录，包含正确的 `page_path`、`user_id`、`session_id`、`device_type`、`country`、`city`

### Tests for User Story 1

- [ ] T014 [P] [US1] 创建 `tests/e2e/analytics.spec.js` — E2E 测试：首页加载后 Supabase 出现 page_view 记录
- [ ] T015 [P] [US1] E2E 测试：游戏页加载后 Supabase 出现 page_view 记录

### Implementation for User Story 1

- [x] T016 [US1] 在 `src/shared/analytics.js` 中实现 `trackPageView(pagePath)` 函数
- [x] T017 [US1] 在 `src/list/main.js` 中集成页面浏览追踪（首页加载完成时调用）
- [x] T018 [US1] 在 `src/game/main.js` 中集成页面浏览追踪（游戏页加载完成时调用）
- [x] T019 [US1] 在 `src/shared/analytics.js` 中实现批量上报逻辑（页面加载时检查 localStorage 暂存队列并上报）

**Checkpoint**: US1 可独立验证 — 任意页面刷新后 Supabase 中新增 page_view 记录

---

## Phase 4: User Story 2 — 游戏交互追踪 (Priority: P1) 🎯 MVP

**Goal**: 记录游戏启动事件和游戏时长事件

**Independent Test**: 启动游戏后退出，检查 Supabase 中出现 `game_start` 和 `game_duration` 记录，时长正确

### Tests for User Story 2

- [ ] T020 [P] [US2] E2E 测试：点击"开始"按钮后 Supabase 出现 `game_start` 记录
- [ ] T021 [P] [US2] E2E 测试：退出游戏后 Supabase 出现 `game_duration` 记录，时长精确

### Implementation for User Story 2

- [x] T022 [US2] 在 `src/shared/analytics.js` 中实现 `trackGameStart(gameName)` 函数
- [x] T023 [US2] 在 `src/shared/analytics.js` 中实现 `trackGameDuration(gameName, durationSeconds)` 函数
- [x] T024 [US2] 在 `src/game/main.js` 中集成游戏启动追踪（"开始"按钮点击时调用 `trackGameStart`）
- [x] T025 [US2] 在 `src/game/main.js` 中集成游戏时长追踪：
  - 记录游戏开始时间
  - "返回列表"按钮点击时计算时长并调用 `trackGameDuration`
  - `beforeunload` 事件中也记录时长（防止意外关闭）
- [x] T026 [US2] 实现 30 分钟时长截断逻辑（`duration_seconds > 1800` 时截断为 1800）

**Checkpoint**: US2 可独立验证 — 启动游戏 → 游玩 → 退出，Supabase 中同时出现 `game_start` 和 `game_duration` 记录

---

## Phase 5: User Story 3 — 数据统计仪表盘 (Priority: P2) + User Story 3.5 — 用户特征分析 (Priority: P2)

**Goal**: 独立的统计仪表盘页面，展示数据汇总和用户特征分布

**Independent Test**: 访问 `stats.html`，验证 KPI 卡片、页面排行、游戏排行、终端分布、城市排行正确展示

### Tests for User Story 3 + 3.5

- [ ] T027 [P] [US3] E2E 测试：仪表盘页面加载后展示正确的 KPI 数据
- [ ] T028 [P] [US3] E2E 测试：切换时间筛选器（今日/本周/本月/全部）后数据变化

### Implementation for User Story 3 + 3.5

- [x] T029 [P] [US3] 创建 `stats.html` — 仪表盘页面 HTML 结构
- [x] T030 [P] [US3] 创建 `src/analytics/style.css` — 仪表盘样式（KPI 卡片、表格、筛选器）
- [x] T031 [US3] 创建 `src/analytics/stats-api.js` — Supabase 查询封装：
  - `getPageViewStats(start, end)` — 页面浏览排行
  - `getGameStats(start, end)` — 游戏数据排行
  - `getDeviceStats(start, end)` — 终端类型分布
  - `getCityStats(start, end)` — Top 10 城市排行
  - `getKpiSummary(start, end)` — KPI 汇总（总浏览量、总启动次数、总时长、UV）
- [x] T032 [US3] 创建 `src/analytics/stats-ui.js` — 仪表盘 UI 渲染：
  - KPI 卡片渲染
  - 表格渲染（页面排行、游戏排行、城市排行）
  - 终端分布条形图渲染
  - 空状态渲染
- [x] T033 [US3] 创建 `src/analytics/main.js` — 仪表盘页面入口逻辑：
  - 时间筛选器切换
  - 数据导出按钮
  - 首次加载默认展示"今日"数据
- [x] T034 [US3] 在 `src/analytics/stats-api.js` 中实现数据导出功能（JSON 格式下载）

**Checkpoint**: US3 + US3.5 可独立验证 — 访问 `stats.html` 能看到完整的仪表盘数据

---

## Phase 6: User Story 4 — 数据导出 (Priority: P3)

**Goal**: 将原始事件数据导出为 JSON 文件

**Independent Test**: 点击"导出数据"按钮，下载的 JSON 文件内容与 Supabase 查询结果一致

### Tests for User Story 4

- [ ] T035 [P] [US4] E2E 测试：点击导出按钮后下载的 JSON 文件包含正确数据

### Implementation for User Story 4

- [ ] T036 [US4] 在 `src/analytics/stats-api.js` 中实现 `exportRawEvents(start, end)` 函数：
  - 查询 Supabase 获取原始事件数据
  - 生成 JSON Blob
  - 触发浏览器下载
- [ ] T037 [US4] 在 `src/analytics/main.js` 中绑定导出按钮点击事件

**Checkpoint**: US4 可独立验证 — 选择时间范围 → 点击导出 → JSON 文件下载成功

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 性能优化、错误处理、文档更新

- [ ] T038 [P] 验证埋点发送异步不阻塞 NES 模拟器 60 fps（Performance 录制检查）
- [ ] T039 [P] 仪表盘页面加载性能优化（确保 1000 条数据下 ≤ 2 秒）
- [ ] T040 [P] 补充 E2E 测试：网络中断降级（Offline → 恢复 → 批量上报）
- [ ] T041 [P] 补充 E2E 测试：空状态展示（清空数据后访问仪表盘）
- [ ] T042 更新 `README.md` 或相关文档，说明埋点系统使用方式
- [ ] T043 [P] 运行 `quickstart.md` 中的所有验证场景，确保全部通过

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup（Supabase 表结构就绪）— 阻塞所有用户故事
- **User Stories (Phase 3~6)**: 依赖 Foundational 完成
  - US1 和 US2 可并行开发（不同文件，无冲突）
  - US3/US3.5 依赖 US1 + US2（需要先有数据展示）
  - US4 依赖 US3（导出按钮在仪表盘页面上）
- **Polish (Phase 7)**: 依赖所有用户故事完成

### User Story Dependencies

- **US1 (P1)** → 可独立实现，只需 Foundational
- **US2 (P1)** → 可独立实现，只需 Foundational，与 US1 并行
- **US3 + US3.5 (P2)** → 需要 US1 + US2 产生的数据才能展示
- **US4 (P3)** → 依赖 US3 的仪表盘页面

### Within Each User Story

- 前端：共享模块（analytics.js）→ 页面集成（list/main.js, game/main.js）
- 仪表盘：API 封装（stats-api.js）→ UI 渲染（stats-ui.js）→ 页面入口（main.js）

### Parallel Opportunities

- **Phase 1**: T004~T007（Supabase 配置）可并行
- **Phase 2**: T008~T010（共享模块）可并行，T013（单元测试）可并行
- **Phase 3 + 4**: US1 和 US2 可完全并行（不同页面，无文件冲突）
- **Phase 5**: T029~T030（HTML/CSS）与 T031（API）可并行

---

## Parallel Example: User Story 1 + User Story 2

```bash
# US1 和 US2 可并行开发：
Task: "T016 [US1] 实现 trackPageView() + T017 [US1] 首页集成"
Task: "T022 [US2] 实现 trackGameStart() + T024 [US2] 游戏页集成"

# 共享模块开发时：
Task: "T008 [P] 创建 analytics.js（Supabase 客户端）"
Task: "T009 [P] 创建 user-id.js"
Task: "T010 [P] 创建 device.js"
```

---

## Implementation Strategy

### MVP First (P1 Only)

1. 完成 Phase 1: Setup（安装依赖、配置 Supabase）
2. 完成 Phase 2: Foundational（共享模块）
3. 完成 Phase 3: US1 — 页面浏览追踪
4. 完成 Phase 4: US2 — 游戏交互追踪
5. **STOP and VALIDATE**: 按 `quickstart.md` P1 场景验证
6. 确认通过后再继续 P2/P3

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. US1 + US2 → P1 MVP（埋点数据收集）→ 验证 → 可独立运行
3. US3 + US3.5 → P2（仪表盘 + 用户特征）→ 验证
4. US4 → P3（数据导出）→ 验证
5. Polish → 性能优化、E2E 测试补全

### 建议的提交节奏

- Phase 1: 一个提交（依赖安装 + 配置）
- Phase 2: 每个共享模块一个提交（T008~T013）
- US1: 一个提交（页面浏览追踪完整功能）
- US2: 一个提交（游戏交互追踪完整功能）
- US3/US3.5: 2-3 个提交（API → UI → 集成）
- US4: 一个提交（导出功能）
- Polish: 一个提交（优化 + 测试）
