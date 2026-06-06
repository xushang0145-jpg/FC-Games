# 实现方案：游戏详情页交互

**Branch**: `001-games-collection` | **Date**: 2026-06-05 | **Spec**: [spec.md](./spec.md)

**Input**: 功能规范 `specs/002-game-detail-page/spec.md`

## 摘要

在现有 FC 游戏合集列表页上，为每款游戏增加详情浮层交互。玩家点击游戏卡片后，页面中央弹出详情浮层，展示游戏信息（图标、名称）和按键操作说明，玩家确认后点击"开始游戏"在新标签页进入游戏运行页。同时记录玩家最近游玩历史，支持在列表页筛选"最近玩过"的游戏。

本功能完全复用现有技术栈，不引入新依赖，仅通过增量模块实现。

## 技术上下文

**语言/版本**: JavaScript (ES2022+)

**核心依赖**: jsnes@1.2.1（不变）、vite（不变）

**存储**: 浏览器 localStorage（新增 `fc_play_history` 键，与现有 `fc_keybindings` 同一名称空间）

**测试**: vitest（单元测试）、@playwright/test（E2E 测试）

**目标平台**: 现代浏览器桌面端（Chrome、Firefox、Safari、Edge 最近 2 个主版本）

**项目类型**: 纯前端 Web 应用增量功能

**性能目标**: 详情浮层从点击到完全展示 <200ms，动画期间不掉帧

**约束**: 
- 不引入新 npm 依赖（日期库、动画库等）
- 不修改 game 页的模拟器核心逻辑（仅增加一行记录启动时间）
- 详情浮层与游戏运行页不在同一标签页，不存在 JS 执行冲突

**规模/范围**: 88 款游戏，单一用户，新增代码预计 ~500 行（JS + CSS）

## 宪章合规检查

*门禁：Phase 0 研究前已通过。Phase 1 设计后重新评估。*

**结构决策**：本功能在现有单项目结构内增量实现，不新增 HTML 入口，不引入新依赖。详情浮层、游玩记录、相对时间格式化各为独立模块，但均轻量且职责单一，符合 YAGNI。

| 原则 | 状态 | 说明 |
| --- | --- | --- |
| I. 规范驱动开发 (SDD) | ✅ 通过 | 本方案基于已确认的 spec.md 和 mockup 设计图构建 |
| II. 方案即契约 | ✅ 通过 | plan.md 将作为实现的唯一依据 |
| III. 渐进交付与独立可测 | ✅ 通过 | P1（详情浮层）→ P2（最近记录）→ P3（快捷键），P1 完成后即可独立演示 |
| IV. 性能即功能 | ✅ 通过 | 详情浮层为纯 CSS/DOM 操作，不涉及游戏模拟关键路径；游戏页仅增加一行 localStorage 写入 |
| V. 简洁优先 (YAGNI) | ✅ 通过 | 不引入日期库、动画库、状态管理库；localStorage 单键存储足够；不创建新 HTML 入口 |

## 项目结构

### 文档（本功能）

```text
specs/002-game-detail-page/
├── spec.md                          # 功能规范
├── plan.md                          # 本文件
├── research.md                      # Phase 0：技术决策记录
├── data-model.md                    # Phase 1：数据模型
├── quickstart.md                    # Phase 1：快速验证指南
├── contracts/                       # Phase 1：接口契约（本功能无外部接口，见 README）
├── detail-modal-first-visit.mockup.html   # 交互设计图 1/2
├── detail-modal-recent.mockup.html        # 交互设计图 2/2
└── tasks.md                         # Phase 2 产出（由 /speckit-tasks 生成）
```

### 源代码（仓库根目录 — 增量改动）

```text
index.html                           # 列表页入口：新增 detail-modal.css 引用
src/
├── list/
│   ├── main.js                      # 修改：卡片点击事件改为打开详情浮层
│   ├── style.css                    # 修改：新增筛选标签样式、卡片最近标签样式
│   ├── detail-modal.js              # 新增：详情浮层模块（打开/关闭/渲染/事件绑定）
│   └── detail-modal.css             # 新增：详情浮层样式（浮层、遮罩、按键表、按钮）
├── game/
│   └── main.js                      # 修改：启动游戏时记录游玩时间（一行调用）
└── shared/
    ├── storage.js                     # 已有：按键配置存储
    ├── play-history.js                # 新增：游玩记录读写（localStorage 封装）
    └── relative-time.js               # 新增：相对时间格式化（"3小时前"/"昨天"）

tests/
├── unit/
│   ├── input.test.js                # 已有
│   ├── storage.test.js              # 已有
│   ├── play-history.test.js         # 新增：游玩记录 CRUD 测试
│   └── relative-time.test.js        # 新增：相对时间格式化测试
└── e2e/
    ├── list.spec.js                   # 已有
    ├── game.spec.js                   # 已有
    └── detail-modal.spec.js           # 新增：浮层交互 E2E 测试
```

### 模块依赖图

```
list/main.js
├── detail-modal.js ──→ shared/play-history.js
│                       └── shared/relative-time.js
│                       └── shared/storage.js (读取按键配置)
└── shared/play-history.js (读取卡片标签)

game/main.js
└── shared/play-history.js (写入启动时间)
```

## 数据流设计

### 详情浮层打开流程

```
用户点击卡片
  → list/main.js 阻止默认跳转
  → 调用 detailModal.open(game, bindings, playRecord)
  → detail-modal.js:
      1. 渲染浮层 DOM（图标、名称、按键表）
      2. 如果有 playRecord，渲染"最近玩过"标签
      3. 绑定事件（关闭按钮、遮罩点击、ESC、Enter）
      4. 禁止 body 滚动
      5. 显示浮层 + 遮罩（CSS transition 淡入）
  → 用户点击"开始游戏"
  → detail-modal.js: window.open('/game.html?rom=xxx', '_blank')
```

### 游玩记录写入流程

```
game/main.js 中用户点击"开始游戏"
  → emulator.start()
  → recordPlayHistory(romFile)        // 新增：一行调用
  → 写入 localStorage: fc_play_history[romFile] = new Date().toISOString()
```

### 最近玩过筛选流程

```
用户点击"最近玩过"筛选标签
  → list/main.js:
      1. 从 play-history.js 读取所有记录
      2. 按 lastPlayedAt 降序排序
      3. 过滤 games 数组，只保留有记录的游戏
      4. 重新渲染网格
  → 卡片渲染时检查 playRecord，显示相对时间标签
```

## 复杂度追踪

> 无宪章违规项，无需记录。
