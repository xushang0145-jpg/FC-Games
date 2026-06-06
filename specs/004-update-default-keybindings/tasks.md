# Tasks: 更新默认按键映射

**Input**: Design documents from `specs/004-update-default-keybindings/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: 单元测试和 E2E 测试任务包含在内，对应已有测试文件。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **源代码**: `src/game/` (input.js, main.js), `src/shared/` (storage.js)
- **单元测试**: `tests/unit/`
- **E2E测试**: `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 无需额外设置 — 项目已初始化，所有基础设施（Vite、jsnes、vitest、Playwright）已就绪。

**Skip**: 此功能不需要新的依赖或项目结构变更，本阶段无任务。

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 无需前置任务 — 现有 `input.js`、`emulator.js`、`storage.js` 均可直接修改，无新增模块依赖。

**Skip**: 所有基础设施已存在，本阶段无任务。

---

## Phase 3: User Story 1 - 新玩家首次打开游戏即可用手感熟悉的键位 (Priority: P1) 🎯 MVP

**Goal**: 默认按键从方向键+Z/X 改为 WASD+J/K 布局，Select/Start 从 ShiftRight/Enter 改为 Digit1/Digit2

**Independent Test**: 清除浏览器所有已保存配置，打开任意游戏，WASD 控制方向、J/K 控制 AB、1/2 投币开始

### Implementation for User Story 1

- [x] T001 [US1] 更新默认按键常量 DEFAULT_BINDINGS（8 项值改为新映射）in `src/game/input.js`
- [x] T002 [US1] 更新按键标签 ACTION_LABELS（新增 turboA/turboB 标签）in `src/game/input.js`
- [x] T003 [US1] 更新 getControllerButton 函数（新增 turboA → BUTTON_A, turboB → BUTTON_B 映射）in `src/game/input.js`
- [x] T004 [US1] 更新 loadBinding 函数（用 { ...DEFAULT_BINDINGS, ...saved } 浅合并，确保新默认值生效且缺失字段自动补充）in `src/game/input.js`
- [x] T005 [US1] 更新 saveBinding 冲突检测（8 → 10 键位 `Object.values(bindings)` 自动适配，无需写死数字）in `src/game/input.js`

### Unit Tests for User Story 1

- [x] T006 [P] [US1] 更新 DEFAULT_BINDINGS 测试（验证 10 个字段、新值正确、无冲突）in `tests/unit/input.test.js`
- [x] T007 [P] [US1] 更新 loadBinding 测试（无配置返回新默认值、浅合并补充缺失键）in `tests/unit/input.test.js`
- [x] T008 [P] [US1] 更新 saveBinding 测试（10 键冲突检测正确工作）in `tests/unit/input.test.js`

**Checkpoint**: 此时新玩家打开游戏应使用 WASD+JK+1/2 默认键位，方向、AB、投币开始均可用。

---

## Phase 4: User Story 2 - 玩家使用连发功能 (Priority: P2)

**Goal**: 按住 I 键触发 A 连发，按住 U 键触发 B 连发，约 12.5 Hz 频率，松开立即停止

**Independent Test**: 打开任意游戏，按住 I 键观察角色持续执行 A 按钮动作，按住 U 键同理；松开立即停止

### Implementation for User Story 2

- [x] T009 [US2] 实现连发状态管理与 setInterval 循环（80ms 间隔交替 buttonDown/buttonUp）in `src/game/input.js` 的 `createInputHandler` 函数
- [x] T010 [US2] 在 main.js 中传递 turbo 连发清理逻辑（页面关闭/切换时 clearInterval）in `src/game/main.js`

### Unit Tests for User Story 2

- [x] T011 [P] [US2] 新增连发功能测试（按住触发、松开停止、连发频率校验）in `tests/unit/input.test.js`

### E2E Tests for User Story 2

- [x] T012 [P] [US2] 新增连发按键 E2E 测试 in `tests/e2e/game.spec.js`

**Checkpoint**: 此时连发功能可用，I/U 键按住自动连发，松开立即停止，与普通 JK 键互不冲突。

---

## Phase 5: User Story 3 - 老用户升级后保留已有自定义配置 (Priority: P3)

**Goal**: 已有自定义按键配置的老用户升级后，原有 8 键配置保留，新 turboA/turboB 自动补充

**Independent Test**: 先在旧版本保存自定义按键，升级后打开同一游戏，原有键位不变，I/U 连发可用

### Implementation for User Story 3

- [x] T013 [US3] 确认 loadBinding 浅合并逻辑覆盖旧格式（8 键 → 补充 turboA/turboB），无需额外代码改动；手动回归验证即可 in `src/game/input.js`

### Unit Tests for User Story 3

- [x] T014 [P] [US3] 新增向后兼容测试（模拟旧 8 键 localStorage 数据，验证升级后保留旧值并补充连发键）in `tests/unit/input.test.js`

**Checkpoint**: 此时新老用户均能正常使用，已有配置不丢失，新连发功能自动可用。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 端到端验证、代码清理、运行 quickstart.md

- [x] T015 [P] 更新 E2E 测试（验证默认 WASD+JK 键位响应）in `tests/e2e/game.spec.js`
- [ ] T016 运行 quickstart.md 所有验证场景并确认通过

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无需 — 跳过
- **Foundational (Phase 2)**: 无需 — 跳过
- **User Stories (Phase 3-5)**: 无基础设施依赖，可直接开始
  - US1 → US2 有逻辑依赖（US2 连发依赖 US1 中新键位结构 `turboA`/`turboB` 字段）
  - US3 依赖 US1 的 `loadBinding` 浅合并逻辑
- **Polish (Phase 6)**: 依赖所有用户故事完成

### User Story Dependencies

- **User Story 1 (P1)**: 无依赖 — 可立即开始
- **User Story 2 (P2)**: 依赖 US1（连发需要 `turboA`/`turboB` 键位和 `getControllerButton` 映射）
- **User Story 3 (P3)**: 依赖 US1（需要 `loadBinding` 浅合并逻辑到位）

### Within Each User Story

- 实现 → 单元测试 → E2E 测试（如有）
- US1 内部 T001-T003 可并行（不同代码段），T004-T005 依赖 T001

### Parallel Opportunities

- T006, T007, T008 （US1 单元测试）可并行
- T011, T012 （US2 单元测试 + E2E）可并行
- T011 与 T009-T010 实现并行（测试先写，预期失败）
- T014, T015 （US3 测试 + E2E）可并行

---

## Parallel Example: User Story 1

```bash
# 先做实现（T001-T003 可并行修改同一文件的不同部分）
Task: "T001 更新 DEFAULT_BINDINGS in src/game/input.js"
Task: "T002 更新 ACTION_LABELS in src/game/input.js"
Task: "T003 更新 getControllerButton in src/game/input.js"

# 再做依赖任务
Task: "T004 更新 loadBinding in src/game/input.js" (depends on T001)
Task: "T005 更新 saveBinding in src/game/input.js" (depends on T001)

# 单元测试并行
Task: "T006 更新 DEFAULT_BINDINGS 测试 in tests/unit/input.test.js"
Task: "T007 更新 loadBinding 测试 in tests/unit/input.test.js"
Task: "T008 更新 saveBinding 测试 in tests/unit/input.test.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 执行 T001-T005：修改 `input.js` 默认按键和合并逻辑
2. 执行 T006-T008：更新单元测试
3. **STOP and VALIDATE**: 清除 localStorage，打开游戏验证 WASD+JK+1/2
4. 提交 MVP

### Incremental Delivery

1. US1 (P1) → 默认键位可玩 → 验证 → 提交
2. US2 (P2) → 添加连发 → 验证 → 提交
3. US3 (P3) → 验证向后兼容 → 提交
4. Phase 6: E2E 测试 + quickstart 完整验证 → 最终提交

### 单开发者策略

由于 US1→US2→US3 有依赖链，建议按优先级顺序依次完成：

1. US1 全部完成并验证
2. US2 全部完成并验证
3. US3 全部完成并验证
4. Phase 6 收尾

---

## Notes

- [P] 任务 = 不同测试文件或无依赖，可并行
- [Story] 标签将任务映射到特定用户故事，便于追踪
- 每个用户故事应可独立完成和测试
- 每次提交一个逻辑组（如完成一个 Phase）
- keybinding-ui.js 无需修改（自动遍历 `Object.entries` 适配键位数变化）
- storage.js 无需修改（读写不校验字段数量）
