# 任务列表：FC 游戏合集

**Input**: 设计文档来自 `specs/001-games-collection/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: 包含单元测试 (vitest) 和 E2E 测试 (@playwright/test)，根据 plan.md 技术上下文要求。

**Organization**: 按用户故事分组，每个故事可独立实现和测试。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件、无依赖）
- **[Story]**: 任务归属用户故事（US1, US2, US3）
- 描述中包含准确的文件路径

---

## Phase 1: 项目初始化 (Setup)

**Purpose**: 创建项目基础文件，使项目可以构建和运行

- [x] T001 创建 `package.json`，包含 jsnes@1.2.1、vite、vitest、@playwright/test 等依赖声明
- [x] T002 创建 `vite.config.js`，配置多页面入口（index.html + game.html）和 roms/ 静态目录
- [x] T003 [P] 创建 `vitest.config.js`，配置 jsdom 环境和单元测试路径 `tests/unit/`
- [x] T004 [P] 创建 `playwright.config.js`，配置 E2E 测试路径 `tests/e2e/` 和浏览器选项
- [x] T005 运行 `npm install` 确认依赖安装成功

---

## Phase 2: 基础设施 (Foundational)

**Purpose**: 所有用户故事都可能依赖的共享模块，MUST 在故事开发前完成

**⚠️ CRITICAL**: 此阶段完成后才能开始任何用户故事

- [x] T006 实现 localStorage 读写封装 `src/shared/storage.js`，按 contracts/storage.md 规范提供 `loadKeyBindings(gameId)`、`saveKeyBindings(gameId, bindings)`、`resetKeyBindings(gameId)` 三个函数
- [x] T007 编写 `storage.js` 单元测试 `tests/unit/storage.test.js`，覆盖读取空配置、保存配置、覆盖配置、删除配置四个场景

**Checkpoint**: 存储层就绪——用户故事实现可以开始

---

## Phase 3: User Story 1 - 浏览游戏合集并开始游戏 (Priority: P1) 🎯 MVP

**Goal**: 玩家打开网站看到平铺网格游戏列表，点击卡片在新标签页打开游戏页，通过投币→开始启动模拟器，使用默认按键玩游戏

**Independent Test**: 从浏览器打开页面，点击任意游戏卡片，验证游戏能加载运行且键盘操控响应正常

### 列表页（index.html 入口）

- [x] T008 [P] [US1] 创建 `index.html`，包含游戏网格容器 `#game-grid`、搜索框占位（US3 实现）、页面标题
- [x] T009 [P] [US1] 创建列表页样式 `src/list/style.css`，实现平铺网格布局、游戏卡片样式（纯色背景 + 文字排版）、hover 效果
- [x] T010 [US1] 创建列表页入口 `src/list/main.js`：通过 `import.meta.glob('/roms/*.nes')` 获取 ROM 文件列表 → 从文件名提取游戏名称 → 渲染卡片网格 → 点击卡片时 `window.open('game.html?rom=...', '_blank')`

### 游戏页（game.html 入口）

- [x] T011 [P] [US1] 创建 `game.html`，包含 Canvas 元素 `#game-canvas`、启动确认面板 `#start-panel`（含投币按钮 `#coin-btn` 和开始按钮 `#start-btn`）、游戏标题 `#game-title`、错误面板 `#error-panel`、浏览器不支持提示 `#unsupported-banner`
- [x] T012 [P] [US1] 创建游戏页样式 `src/game/style.css`，实现 Canvas 居中全屏显示、启动面板居中浮层、按键设置面板样式

### 模拟器核心

- [x] T013 [US1] 创建 jsnes 封装模块 `src/game/emulator.js`，实现：
  - `init(canvas, audioCtx)` → 创建 jsnes.NES 实例，设置 onFrame 回调（写入 Canvas ImageData，256×240 缩放到显示尺寸）
  - `loadROM(arrayBuffer)` → fetch ROM → 转换 ArrayBuffer → 调用 `nes.loadROM()`
  - `start()` → resume AudioContext → 启动 requestAnimationFrame 帧循环（每帧调用 `nes.frame()`）
  - `stop()` → 停止帧循环、关闭 AudioContext
  - `onAudioSample(left, right)` → 样本入队到环形缓冲区 → AudioContext 播放
  - `buttonDown(controller, button)` / `buttonUp(controller, button)` → 转发到 nes 实例

### 游戏页入口逻辑

- [x] T014 [US1] 创建游戏页入口 `src/game/main.js`，实现：
  - 从 URL 解析 `?rom=` 参数
  - 浏览器能力检测（Canvas、Web Audio），不支持时显示 `#unsupported-banner`
  - 创建 AudioContext（suspend 状态）
  - 初始化 Emulator
  - 启动确认流程：点击 `#coin-btn` → 调用 `emulator.buttonDown(0, Select)` + `buttonUp`；点击 `#start-btn` → `emulator.start()` 启动帧循环 + `emulator.buttonDown(0, Start)` + `buttonUp`
  - ROM 加载失败时显示 `#error-panel`，提供重试和返回列表
  - `beforeunload` 时调用 `emulator.stop()` 释放资源
  - 默认按键监听：keydown/keyup 映射到 emulator.buttonDown/buttonUp

**Checkpoint**: 此时用户故事 1 应完全可用——从列表页选游戏到玩游戏完整链路可独立验证

---

## Phase 4: User Story 2 - 自定义按键设置 (Priority: P2)

**Goal**: 玩家可以在游戏页打开按键设置面板，为当前游戏自定义按键映射，配置按游戏独立持久化

**Independent Test**: 打开按键设置面板，修改方向键映射为 WASD、A 按钮映射为空格，保存后返回游戏，验证新按键生效、旧默认按键不响应

### 按键映射逻辑

- [x] T015 [US2] 创建按键映射模块 `src/game/input.js`，实现：
  - 默认按键映射常量（方向键→方向、Z→A、X→B、Enter→Start、ShiftRight→Select）
  - `loadBinding(gameId)` → 从 storage.js 读取该游戏的自定义配置，无配置时返回默认
  - `saveBinding(gameId, bindings)` → 冲突检测（`new Set(Object.values(bindings)).size === 8`），通过后调用 storage.js 保存
  - 导出按键事件监听器工厂：根据当前 binding 将 keydown/keyup 转发为 emulator buttonDown/buttonUp
- [x] T016 编写 input.js 单元测试 `tests/unit/input.test.js`，覆盖：默认配置正确性、冲突检测（全不重复通过、有重复拒绝）、保存后读取一致

### 按键设置面板 UI

- [x] T017 [US2] 创建按键设置面板模块 `src/game/keybinding-ui.js`，实现：
  - 渲染设置面板 `#keybind-panel`：8 个操作行，每行显示操作名称和当前绑定按键
  - 点击某行进入"监听模式"：等待玩家按下新按键，更新映射
  - 冲突检测：新按键与已有映射冲突时高亮提示，不允许重复
  - 保存按钮 `#keybind-save`：调用 `input.saveBinding()` 持久化并更新当前游戏按键监听
  - 取消/关闭按钮：丢弃修改恢复原配置
  - 通过 `#keybind-btn` 打开面板

### 集成到游戏页

- [x] T018 [US2] 在 `src/game/main.js` 中集成 input.js 和 keybinding-ui.js：页面加载时 `loadBinding(gameId)` 获取当前配置；替换 T014 中的硬编码默认按键逻辑为 input.js 的监听器工厂

**Checkpoint**: 此时用户故事 1 和 2 均可独立运行——核心游戏体验 + 按键自定义都已完成

---

## Phase 5: User Story 3 - 游戏合集浏览增强 (Priority: P3)

**Goal**: 玩家可以在列表页通过搜索框按名称实时过滤游戏

**Independent Test**: 在游戏列表页面输入搜索关键词，验证列表实时过滤；验证无匹配结果时的友好提示

- [x] T019 [US3] 在 `src/list/main.js` 中添加搜索过滤功能：为 `#search-input` 绑定 input 事件 → 实时过滤游戏卡片显示/隐藏 → 无匹配时显示 `#no-results` 提示 → 清空搜索框恢复全列表

**Checkpoint**: 所有三个用户故事均可独立运行和验证

---

## Phase 6: E2E 测试与收尾 (Polish)

**Purpose**: 端到端验证和整体质量保障

- [x] T020 [P] 编写列表页 E2E 测试 `tests/e2e/list.spec.js`，覆盖：页面加载渲染卡片、点击卡片新标签页打开、搜索过滤、空搜索结果提示
- [x] T021 [P] 编写游戏页 E2E 测试 `tests/e2e/game.spec.js`，覆盖：URL 参数解析、启动确认面板显示、投币和开始按钮、Canvas 渲染出现、按键设置面板、ROM 不存在错误处理
- [x] T022 运行 quickstart.md 全部验证场景，确保 8 个场景通过

---

## 依赖关系与执行顺序

### 阶段依赖

- **Phase 1 (Setup)**: 无依赖——立即开始
- **Phase 2 (Foundational)**: 依赖 Setup 完成——BLOCKS 所有用户故事
- **Phase 3 (US1)**: 依赖 Foundational 完成——无其他故事依赖
- **Phase 4 (US2)**: 依赖 Foundational 完成 + US1 游戏页骨架（T011/T014），可独立测试
- **Phase 5 (US3)**: 依赖 US1 列表页（T008/T010），纯增量修改
- **Phase 6 (Polish)**: 依赖所有目标用户故事完成

### 用户故事依赖

- **US1 (P1)**: 无依赖其他故事——仅需 Phase 2 完成
- **US2 (P2)**: 依赖 US1 的游戏页 DOM 骨架（T011/T014），但按键功能本身独立可测
- **US3 (P3)**: 依赖 US1 的列表页（T008/T010），纯增量功能

### 故事内部执行顺序

- US1: HTML → CSS (并行) → list/main.js → game.html / game/style.css (并行) → emulator.js → game/main.js
- US2: input.js → input.test.js (并行) → keybinding-ui.js → 集成到 game/main.js
- US3: 单文件修改，无内部依赖

### 并行机会

- Setup: T003 + T004 可并行（不同配置文件）
- US1: T008 + T009 可并行（不同文件）；T011 + T012 可并行（不同文件）
- US2: T016 可在 T015 完成后并行（测试依赖模块，但可同时写入）
- E2E: T020 + T021 可并行（不同测试文件）

---

## 并行执行示例：User Story 1

```bash
# 并行的列表页文件：
Task: "T008 创建 index.html"
Task: "T009 创建 src/list/style.css"

# 列表页入口（依赖 T008+T009）：
Task: "T010 创建 src/list/main.js"

# 并行的游戏页文件：
Task: "T011 创建 game.html"
Task: "T012 创建 src/game/style.css"

# 模拟器核心（独立模块）：
Task: "T013 创建 src/game/emulator.js"

# 游戏页入口（依赖 T011+T013）：
Task: "T014 创建 src/game/main.js"
```

---

## 实现策略

### MVP First（仅 User Story 1）

1. 完成 Phase 1: Setup → 项目可构建
2. 完成 Phase 2: Foundational → 存储层就绪
3. 完成 Phase 3: US1 → 列表选游戏 + 模拟器玩游戏
4. **停下来验证**: 按 quickstart.md 场景 1-4、7-8 测试
5. 可演示/部署 MVP

### 渐进交付

1. Setup + Foundational → 基础就绪
2. US1 → 独立测试 → MVP 可交付
3. US2 → 独立测试 → 按键自定义可交付
4. US3 → 独立测试 → 搜索过滤可交付
5. E2E 测试 + 收尾 → 完整交付

### 单人顺序开发建议

```
Phase 1 → Phase 2 → T008→T009→T010 → T011→T012→T013→T014 →
T015→T016→T017→T018 → T019 → T020→T021→T022
```

---

## Notes

- [P] 任务 = 不同文件、无依赖，可并行
- [Story] 标签将任务映射到特定用户故事，便于跟踪
- 每个用户故事应可独立完成和测试
- 每个任务或逻辑组完成后提交
- 任意 checkpoint 处可停下来独立验证故事
- 所有文档、注释、提交信息 MUST 使用中文（宪章要求）
- 关键路径（frame 回调、音频回调、输入处理）MUST 保持轻量
