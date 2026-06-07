# 任务：去掉投币相关操作，简化游戏启动流程

**Input**: 设计文档来自 `/specs/011-remove-coin-overlay/`

**Prerequisites**: plan.md, spec.md

**Organization**: 任务按改动文件分组，P1 用户故事内的任务标注并行动作。

## 格式: `[ID] [P?] [US?] 描述`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[US1]**: 用户故事 1（从列表直接进入游戏）
- **[US2]**: 用户故事 2（首次按键激活音频）
- 每个任务包含精确文件路径

---

## Phase 1: P1 核心改动（用户故事 1 + 2）

**Goal**: 列表页点击在当前页跳转、game.html 移除浮层、ROM 加载后直接渲染画面、首次按键激活音频。

**Independent Test**: 运行 `npm run dev` → 列表页点击游戏卡片 → 在当前页跳转 → ROM 加载完直接显示画面 → 按键盘操作游戏且有声音。

### E2E 测试（先写测试，验证改动正确性）

- [X] T001 [P] [US1] 验证列表页点击游戏卡片在当前页跳转（非新标签页）in `tests/e2e/remove-coin-overlay.spec.js`
- [X] T002 [P] [US1] 验证游戏页无 start-overlay DOM 元素 in `tests/e2e/remove-coin-overlay.spec.js`
- [X] T003 [P] [US1] 验证 ROM 加载后直接显示 Canvas 画面（无弹窗阻挡）in `tests/e2e/remove-coin-overlay.spec.js`
- [X] T004 [P] [US2] 验证首次按键激活音频（按键后 AudioContext 状态变为 running）in `tests/e2e/remove-coin-overlay.spec.js`

### 实现（按依赖顺序）

- [X] T005 [US1] 修改 `src/list/detail-modal.js` 第 191 行 — `window.open(..., '_blank')` → `window.location.href`
- [X] T006 [P] [US1] 修改 `game.html` — 移除 start-overlay DOM（第 24-34 行），在顶栏添加 `<span class="topbar__title" id="topbar-title">` 标题元素
- [X] T007 [P] [US1] 修改 `src/game/style.css` — 移除 `.start-overlay` 相关样式（~80 行），新增 `.topbar__title` 样式
- [X] T008 [US1] 修改 `src/game/emulator.js` `start()` — 移除 `setupAudio()` 和 `audioCtx.resume()` 调用，`start()` 仅设置 status 和启动帧循环
- [X] T009 [US2] 修改 `src/game/input.js` `createInputHandler()` — 新增 `options.onFirstInteraction` 参数，首次 keydown 时触发回调
- [X] T010 [US1][US2] 修改 `src/game/main.js` — 重写初始化流程：
  - 移除 `startOverlay`/`coinBtn`/`startBtn`/`gameTitleEl` 的 DOM 引用
  - 移除 `coinInserted`/`romLoaded` 状态变量
  - 移除投币/开始按钮的 click 事件监听器
  - 新增顶栏标题展示逻辑
  - ROM 校验通过后直接调用 `emulator.start()` 启动帧循环
  - ROM 校验通过后调用 `recordPlayHistory()` + `trackGameStart()`
  - 传入 `onFirstInteraction` 给 `createInputHandler`，首次按键时调用 `emulator.setupAudio()`
- [X] T011 [P] [US1] 更新 `nimbalyst-local/mockups/game-page.mockup.html` — 移除 start-overlay 相关 HTML/CSS

---

## Phase 2: 验证

- [ ] T012 运行 `npm run dev`，手动验证完整流程：列表页点击 → 跳转 → 画面渲染 → 按键+音频
- [ ] T013 运行 `npx playwright test tests/e2e/remove-coin-overlay.spec.js` 验证 E2E 测试通过
- [ ] T014 验证移动端虚拟手柄：触屏按键正常响应、音频正常
- [ ] T015 验证 ROM 不存在时的错误面板：显示错误、重试按钮、返回列表按钮均正常

---

## 依赖与执行顺序

```
T005 (detail-modal.js) ──┐
                          ├──→ T010 (main.js 重写) ──→ T012-T015 (验证)
T006 (game.html) ────────┤
T007 (style.css) ────────┤
T008 (emulator.js) ──────┤
T009 (input.js) ─────────┘
T011 (mockup) ───────────┘

T001-T004 (E2E 测试) —— 可与其他任务并行，在 T005-T011 完成后执行
```

## 并行动作

- T001-T004：全部 E2E 测试可并行编写
- T006、T007、T008、T009、T011：不同文件无依赖，可在 T005 完成后并行执行
- T010 依赖 T006/T007/T008/T009 完成（需要新的 HTML 结构、CSS、emulator API、input API）
