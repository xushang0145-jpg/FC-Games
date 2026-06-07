# Tasks: 移动端触摸控制

**Input**: Design documents from `/specs/010-mobile-touch-controls/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Tests**: 单元测试使用 vitest，E2E 测试使用 @playwright/test（移动端模拟模式）

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: 设备检测模块，所有用户故事依赖的基础判断

**⚠️ CRITICAL**: 此阶段完成前，任何用户故事都不能开始实现

- [x] T001 在已有 `src/shared/device.js` 中新增 `isMobileDevice()` 函数：包装 `detectDeviceType()`，返回布尔值（`detectDeviceType() !== 'desktop'`），供虚拟手柄显示判断使用
- [x] T002 创建 `isMobileDevice()` 函数的单元测试 `tests/unit/device.test.js`（覆盖：手机 UA + 小屏 → true、桌面 UA + 大屏 → false、平板 UA + 大屏 → true、桌面模拟移动模式 → true）
- [x] T003 在 `game.html` 中添加虚拟手柄 DOM 容器 `<div class="virtual-gamepad" id="virtual-gamepad"></div>`（初始隐藏，通过 JS 控制显示）

**Checkpoint**: 设备检测就绪，game.html 中 DOM 容器已添加，可以开始实现各用户故事

---

## Phase 2: User Story 1 — 基础虚拟手柄 (Priority: P1) 🎯 MVP

**Goal**: 移动端游戏页面显示虚拟方向键（十字布局）和 A/B 操作按钮，触摸操作等效于键盘输入

**Independent Test**: 在移动设备或 DevTools 移动模拟模式下打开游戏页，虚拟手柄可见且可交互

### Tests for User Story 1

- [x] T004 [P] [US1] 单元测试 `tests/unit/virtual-gamepad.test.js`：测试按钮映射（虚拟按键 → jsnes Controller 常量）
- [x] T005 [P] [US1] E2E 测试 `tests/e2e/mobile-gamepad.spec.js`：虚拟手柄在移动端可见、桌面端隐藏

### Implementation for User Story 1

- [x] T006 [P] [US1] 创建虚拟手柄样式 `src/game/virtual-gamepad.css`：
  - 横屏布局：方向键左下角，A/B 按钮右下角
  - 竖屏布局：方向键和按钮堆叠在画面下方
  - 按钮样式（圆角、阴影、半透明背景）
  - 按下状态视觉反馈（scale 0.92 + opacity 0.8）
  - `touch-action: none` 阻止浏览器默认行为
- [x] T007 [US1] 创建虚拟手柄核心模块 `src/game/virtual-gamepad.js`：
  - `createVirtualGamepad(containerEl, emulator)` 工厂函数
  - 方向键按钮（上/下/左/右）创建与 DOM 插入
  - A 按钮和 B 按钮创建与 DOM 插入
  - 按钮布局（十字方向键 + 右侧 A/B 按钮组）
- [x] T008 [US1] 在 `virtual-gamepad.js` 中实现触摸事件处理：
  - `touchstart` → `emulator.buttonDown(1, button)`
  - `touchend` → `emulator.buttonUp(1, button)`
  - `touchcancel` → `emulator.buttonUp(1, button)`
  - 通过 `touch.identifier` 独立跟踪每个手指
  - 内置 `getControllerButton(action)` 映射函数（与 input.js 等价，解耦复用）
- [x] T009 [US1] 在 `src/game/main.js` 中集成虚拟手柄初始化：
  - 调用 `isMobileDevice()` 判断是否移动端
  - 移动端时：`createVirtualGamepad(container, emulator)` 并显示
  - 桌面端时：不初始化虚拟手柄
- [x] T010 [US1] 在 `game.html` 中引入 `virtual-gamepad.css` 样式文件
- [x] T011 [US1] 在 `src/game/style.css` 中添加虚拟手柄容器基础样式（固定底部定位、z-index 层级）

**Checkpoint**: 移动端进入游戏页后虚拟手柄可见，触摸方向键和 A/B 按钮后游戏角色正确响应

---

## Phase 3: User Story 2 — 功能键支持 (Priority: P2)

**Goal**: 虚拟手柄增加 Start 和 Select 按钮，实现与实体手柄一致的功能完整性

**Independent Test**: 在需要 Start/Select 功能的游戏中测试（如《超级玛莉》标题画面按 Start 进入游戏）

### Tests for User Story 2

- [x] T012 [P] [US2] E2E 测试：虚拟 Start 按钮按下后游戏开始/暂停
- [x] T013 [P] [US2] E2E 测试：虚拟 Select 按钮按下后执行选择操作

### Implementation for User Story 2

- [x] T014 [P] [US2] 在 `src/game/virtual-gamepad.js` 中添加 Start 按钮创建逻辑（布局：顶部中央或方向键上方）
- [x] T015 [P] [US2] 在 `src/game/virtual-gamepad.js` 中添加 Select 按钮创建逻辑（布局：Start 按钮旁边）
- [x] T016 [US2] 在 `src/game/virtual-gamepad.css` 中为 Start/Select 按钮添加样式（较小尺寸，区别于 A/B 按钮）

**Checkpoint**: 移动端可用虚拟 Start 按钮开始/暂停游戏，Select 按钮执行菜单选择

---

## Phase 4: User Story 3 — 触摸体验优化 (Priority: P3)

**Goal**: 优化触摸体验，支持多指操作、触摸容差、横竖屏自适应，防止误触和浏览器手势冲突

**Independent Test**: 在移动设备上连续游玩 10 分钟，虚拟手柄保持稳定响应

### Implementation for User Story 3

- [x] T017 [US3] 在 `virtual-gamepad.js` 中支持多指同时操作：
  - 方向键 + A 按钮同时按下
  - 方向键 + B 按钮同时按下
  - 使用 `touch.identifier` 跟踪多个手指状态
- [x] T018 [US3] 在 `virtual-gamepad.js` 中实现触摸容差机制：
  - 手指在按钮区域内轻微滑动不释放按钮
  - 手指滑出按钮的容差边界（如 20px）后释放
  - 手指滑回按钮区域后重新触发
- [x] T019 [US3] 在 `virtual-gamepad.js` 中实现横竖屏自适应：
  - 监听 `orientationchange` 事件
  - 横屏/竖屏切换时更新虚拟手柄布局
  - 使用 CSS 媒体查询 `@media (orientation: landscape/portrait)` 辅助
- [x] T020 [US3] 在 `virtual-gamepad.css` 中优化小屏幕设备适配（宽度 < 360px）：
  - 按钮尺寸缩小但不小于 44px（iOS HIG 最低触控区域）
  - 布局紧凑但保证操作可用性
- [x] T021 [US3] 在 `virtual-gamepad.js` 中添加浏览器手势冲突防护：
  - 方向键在屏幕边缘时阻止 iOS Safari 返回手势
  - `preventDefault()` 阻止文本选择和上下文菜单
  - CSS `-webkit-touch-callout: none` 阻止长按链接预览

**Checkpoint**: 多指操作流畅，按钮不粘连，横竖屏切换自适应，无浏览器手势冲突

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 性能验证、完整性检查、文档更新

- [x] T022 [P] 性能验证：游戏启用虚拟手柄后帧率保持在 58+ fps（Performance API 录制，见 quickstart.md 场景 9）
- [x] T023 [P] 触摸响应延迟验证：从手指触碰到游戏响应 < 50ms（见 quickstart.md 场景 10）
- [x] T024 [P] 补充 E2E 测试：横竖屏切换后虚拟手柄布局正确
- [x] T025 [P] 补充 E2E 测试：桌面端访问时不显示虚拟手柄
- [x] T026 运行 `quickstart.md` 中所有验证场景，确认全部通过

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: 无依赖 — 可立即开始，阻塞所有用户故事
- **US1 (Phase 2)**: 依赖 Foundational — 基础虚拟手柄
- **US2 (Phase 3)**: 依赖 US1 — 在已有手柄基础上增加 Start/Select
- **US3 (Phase 4)**: 依赖 US1 — 优化已有的触摸交互，不依赖 US2
- **Polish (Phase 5)**: 依赖所有期望的用户故事完成

### User Story Dependencies

| 故事 | 依赖 | 说明 |
|------|------|------|
| US1 (基础虚拟手柄) | Phase 1 | 核心功能，其他故事的基础 |
| US2 (功能键) | Phase 1 + US1 | 在 US1 手柄上添加 Start/Select 按钮 |
| US3 (触摸优化) | Phase 1 + US1 | 优化 US1 的触摸体验，与 US2 可并行 |

### Within Each User Story

- 样式 (CSS) 先于 JS 逻辑还是并行均可
- 核心逻辑先于页面集成
- 集成后验证独立可测

### Parallel Opportunities

- **Phase 2 (US1)**: T004、T005（测试）与 T006（CSS）可并行；T007→T008→T009 需串行
- **Phase 3 (US2)** 与 **Phase 4 (US3)**: 可完全并行（US2 添加按钮，US3 优化已有交互，不冲突）
- **Phase 5**: T022~T025 全部可并行

---

## Parallel Example: US2 + US3 并行

```bash
# US2 和 US3 可并行开发（不同关注点）：
Task: "T014-T016 [US2] 添加 Start/Select 按钮"
Task: "T017-T021 [US3] 触摸体验优化（多指、容差、自适应）"

# Phase 5 全部可并行：
Task: "T022 性能验证"
Task: "T023 延迟验证"
Task: "T024 E2E: 横竖屏"
Task: "T025 E2E: 桌面端隐藏"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. 完成 Phase 1: Foundational（设备检测 + DOM 容器）
2. 完成 Phase 2: US1 — 基础虚拟手柄
3. **STOP and VALIDATE**: 在移动设备上测试方向键 + A/B 按钮
4. 确认可玩后再继续 P2/P3

### Incremental Delivery

1. Foundational → 设备检测就绪
2. US1 → 基础虚拟手柄可玩 → **MVP 完成！**
3. US2 → Start/Select 功能键 → 功能完整性
4. US3 → 触摸体验优化 → 生产级别体验
5. Polish → 性能验证、E2E 测试

### 建议的提交节奏

- Phase 1: 一个提交（设备检测 + DOM 容器）
- US1: 2 个提交（CSS 样式 + JS 核心逻辑与集成）
- US2: 一个提交（Start/Select 按钮）
- US3: 1-2 个提交（多指 + 容差 / 自适应 + 手势防护）
- Polish: 一个提交（性能验证 + E2E 补全）

---

## Notes

- `[P]` tasks = 不同文件、无依赖
- `[Story]` label 将任务映射到具体用户故事，便于追溯
- 每个用户故事应独立可完成、独立可测试
- 010 为纯前端功能，无外部依赖（不新增 npm package）
- 与 006 的模块边界：010 修改 `src/shared/device.js`（新增 isMobileDevice 函数）、`src/game/`（新增 virtual-gamepad.js/css、修改 main.js 和 style.css）和 `game.html`（新增容器和 CSS 引用），与 006 无冲突
- 虚拟手柄复用 `src/game/input.js` 中的 `getControllerButton` 函数，不修改 `input.js`
- 在任意 checkpoint 可停下来独立验证故事
