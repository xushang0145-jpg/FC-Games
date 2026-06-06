# Implementation Plan: 埋点数据统计

**Branch**: `006-analytics-tracking` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-analytics-tracking/spec.md`

## Summary

实现一套埋点数据统计系统，包含页面浏览追踪、游戏交互追踪、统计仪表盘和数据导出四大功能。数据主存储使用 Supabase（PostgreSQL），网络不可用时降级到 localStorage 暂存，下次页面加载时批量上报。统计仪表盘通过独立页面 `/stats.html`（或 `/admin`）直接访问。

交付按 P1 → P2 → P3 分阶段：P1 完成页面浏览和游戏交互的数据收集，P2 完成统计仪表盘，P3 完成数据导出。

## Technical Context

**Language/Version**: JavaScript (ES2020+)，浏览器环境

**Primary Dependencies**:
- `@supabase/supabase-js` — Supabase 客户端（数据读写）
- `jsnes@1.2.1` — NES 模拟器（现有依赖）
- `vite` — 构建工具（现有依赖）
- `vitest` — 单元测试（现有依赖）
- `@playwright/test` — E2E 测试（现有依赖）

**Storage**: Supabase PostgreSQL（主存储）+ localStorage（降级暂存，上限 100 条）

**Testing**: vitest（单元测试）、@playwright/test（E2E 测试）

**Target Platform**: 现代浏览器（Chrome、Firefox、Safari、Edge 最近 2 个主版本），桌面端优先

**Project Type**: web-application（静态站点 + Supabase BaaS）

**Backend Architecture**: 无自建后端。前端通过 `@supabase/supabase-js` 直连 Supabase，利用 RLS 策略控制权限。IP 定位调用第三方 API（`ipapi.co/json`）。数据清理使用 Supabase 内置 `pg_cron`。

**Performance Goals**:
- NES 模拟器稳定 60 fps，埋点数据收集对渲染性能无可见影响
- 埋点事件发送异步非阻塞，不占用主线程
- 统计仪表盘页面加载时间 ≤ 2 秒（1000 条事件场景）

**Constraints**:
- 埋点代码必须轻量，不阻塞主线程
- 网络失败时自动降级到 localStorage 暂存，不中断核心游戏体验
- 单次游玩时长超过 30 分钟时截断为 30 分钟
- 遵循 YAGNI：不做当前不需要的抽象

**Scale/Scope**:
- 单用户场景，单机日事件量 < 1000 条
- 统计仪表盘聚合查询在 1000 条事件量下 ≤ 2 秒

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
| --- | --- | --- |
| I. 规范驱动开发 (SDD) | ✅ 通过 | 已执行 specify、clarify，当前正在 plan 阶段 |
| II. 方案即契约 | ✅ 通过 | plan.md 将作为实现的唯一依据 |
| III. 渐进交付与独立可测 | ✅ 通过 | P1（浏览+游戏追踪）→ P2（仪表盘）→ P3（导出），每阶段可独立验证 |
| IV. 性能即功能 | ⚠️ 需关注 | 埋点发送必须异步非阻塞；Supabase 查询需加索引保证性能 |
| V. 简洁优先 (YAGNI) | ⚠️ 需关注 | 引入 Supabase 增加了外部依赖，但用户明确要求且解决 localStorage 容量限制 |

**性能保障措施**:
- 埋点事件使用 `fetch` 异步发送，不 `await`，不阻塞游戏渲染循环
- 批量上报时使用 Supabase `upsert` 或批量 `insert`
- 统计查询使用数据库索引（`event_type`、`client_timestamp`、`game_name`）
- 仪表盘数据聚合在 Supabase 端通过 SQL 完成，前端只做展示

## Project Structure

### Documentation (this feature)

```text
specs/006-analytics-tracking/
├── plan.md              # 本文件
├── spec.md              # 功能规范
├── research.md          # Phase 0 研究成果
├── data-model.md        # Phase 1 数据模型
├── quickstart.md        # Phase 1 验证指南
├── contracts/           # Phase 1 API 契约
└── tasks.md             # Phase 2 任务列表（由 /speckit-tasks 生成）
```

### Source Code (repository root)

```text
src/
├── list/                # 首页代码（现有）
│   ├── main.js
│   ├── style.css
│   └── detail-modal.js
├── game/                # 游戏页代码（现有）
│   ├── main.js
│   ├── emulator.js
│   ├── input.js
│   └── style.css
├── shared/              # 共享模块（现有 + 新增）
│   ├── storage.js       # 按键配置存储（现有）
│   ├── play-history.js  # 游玩记录（现有）
│   ├── analytics.js     # 【新增】埋点核心模块
│   ├── device.js        # 【新增】终端类型检测
│   └── geo.js           # 【新增】IP 地理位置获取
├── analytics/           # 【新增】统计仪表盘页面
│   ├── main.js          # 仪表盘页面入口
│   ├── stats-api.js     # Supabase 查询封装
│   ├── stats-ui.js      # 仪表盘 UI 渲染
│   └── style.css        # 仪表盘样式
└── stats.html           # 【新增】统计仪表盘 HTML 入口

tests/
├── e2e/                 # Playwright E2E 测试
│   ├── list.spec.js     # 首页测试（现有）
│   └── analytics.spec.js # 【新增】埋点功能 E2E 测试
└── unit/                # Vitest 单元测试
    └── analytics.test.js # 【新增】埋点逻辑单元测试
```

**Structure Decision**: 采用单项目结构，在现有 `src/` 目录下新增 `analytics/` 目录存放仪表盘专用代码。埋点核心逻辑放在 `src/shared/analytics.js`，被首页和游戏页共用。Supabase 客户端初始化放在 `src/shared/analytics.js` 中，通过环境变量注入 URL 和 anon key。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| 引入 Supabase 外部依赖 | 用户明确要求，解决 localStorage 容量限制和跨设备数据聚合需求 | 纯 localStorage 方案无法解决容量限制，数据也无法跨设备汇总 |
