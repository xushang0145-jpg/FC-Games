# Tasks: 游戏详情页交互

**Input**: Design documents from `/specs/002-game-detail-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare module files and confirm existing project structure

- [X] T001 Verify existing project structure matches plan.md: index.html, src/list/main.js, src/list/style.css, src/game/main.js, src/shared/storage.js all exist and are importable
- [X] T002 [P] Create empty module file `src/shared/play-history.js`
- [X] T003 [P] Create empty module file `src/shared/relative-time.js`
- [X] T004 [P] Create empty module file `src/list/detail-modal.js`
- [X] T005 [P] Create empty stylesheet `src/list/detail-modal.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core shared modules that MUST be complete before any user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Implement `recordPlayHistory(gameId)` in `src/shared/play-history.js` — writes ISO8601 timestamp to localStorage key `fc_play_history`
- [X] T007 [P] Implement `getPlayHistory(gameId)` in `src/shared/play-history.js` — reads and returns `{ lastPlayedAt: string | null }`
- [X] T008 [P] Implement `getAllPlayHistory()` in `src/shared/play-history.js` — returns all records as `Record<string, string>`
- [X] T009 [P] Implement `formatRelativeTime(isoString)` in `src/shared/relative-time.js` — returns "刚刚"/"X分钟前"/"X小时前"/"昨天"/"X天前"
- [X] T010 [P] Write unit tests for `play-history.js` in `tests/unit/play-history.test.js` — test write, read, update, all-records
- [X] T011 [P] Write unit tests for `relative-time.js` in `tests/unit/relative-time.test.js` — test all time ranges

**Checkpoint**: Foundation ready — `play-history.js` and `relative-time.js` pass unit tests

---

## Phase 3: User Story 1 - 游戏详情预览与启动 (Priority: P1) 🎯 MVP

**Goal**: 玩家点击游戏卡片弹出详情浮层，展示游戏信息和按键说明，点击"开始游戏"在新标签页进入游戏运行页，支持关闭浮层。

**Independent Test**: 打开列表页，点击任意游戏卡片 → 浮层弹出 → 显示图标/名称/按键表 → 点击"开始游戏"跳转 game.html → 回到列表页按 ESC 关闭浮层。

### E2E Tests for User Story 1

- [X] T012 [P] [US1] Write E2E test "点击卡片弹出详情浮层" in `tests/e2e/detail-modal.spec.js` — 验证浮层可见、显示正确游戏名称
- [X] T013 [P] [US1] Write E2E test "浮层显示按键操作说明" in `tests/e2e/detail-modal.spec.js` — 验证 8 个按键项渲染
- [X] T014 [P] [US1] Write E2E test "点击开始游戏跳转" in `tests/e2e/detail-modal.spec.js` — 验证新标签页打开 game.html?rom=xxx
- [X] T015 [P] [US1] Write E2E test "关闭浮层多种方式" in `tests/e2e/detail-modal.spec.js` — 验证关闭按钮、遮罩点击、ESC 键

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement detail modal markup and styles in `src/list/detail-modal.css` — backdrop, modal panel, header, controls table, footer, animations
- [X] T017 [US1] Implement `createDetailModal()` factory in `src/list/detail-modal.js` — open(game, bindings, playRecord), close(), render DOM, bind events (close button, backdrop click, ESC key), lock body scroll on open (FR-005)
- [X] T017a [P] [US1] Implement `detail-modal.js` window resize handler — update modal `max-height` to `85vh`, set modal body `overflow-y: auto` when content exceeds height (FR-005, edge case "窗口大小变化")
- [X] T018 [US1] Modify card click handler in `src/list/main.js` — replace `window.open` with `detailModal.open(game, bindings, playRecord)`
- [X] T019 [US1] Add `detail-modal.css` link to `index.html` — `<link rel="stylesheet" href="/src/list/detail-modal.css">`
- [X] T020 [US1] Import and wire `createDetailModal` in `src/list/main.js` — import from `./detail-modal.js`, create instance, pass game data and key bindings

**Checkpoint**: User Story 1 fully functional — all 5 acceptance scenarios pass, E2E tests pass

---

## Phase 4: User Story 2 - 最近游玩记录 (Priority: P2)

**Goal**: 记录玩家启动游戏的时间戳，详情浮层显示"最近玩过"标签，列表页支持"最近玩过"筛选。

**Independent Test**: 启动任意游戏后返回列表页 → 打开同一游戏浮层 → 显示"最近玩过"标签 → 列表页点击"最近玩过"筛选 → 只显示有记录的游戏。

### E2E Tests for User Story 2

- [X] T021 [P] [US2] Write E2E test "首次游玩不显示最近标签" in `tests/e2e/detail-modal.spec.js` — 清除记录后验证无标签
- [X] T022 [P] [US2] Write E2E test "已玩过游戏显示最近标签" in `tests/e2e/detail-modal.spec.js` — 模拟记录后验证标签和时间显示
- [X] T023 [P] [US2] Write E2E test "最近玩过筛选" in `tests/e2e/detail-modal.spec.js` — 验证筛选后列表只显示有记录的游戏

### Implementation for User Story 2

- [X] T024 [US2] Modify `src/game/main.js` — call `recordPlayHistory(romFile)` when user clicks "开始游戏" (after emulator.start())
- [X] T025 [US2] Modify `createCard()` in `src/list/main.js` — pass playRecord to card, render "X小时前" badge if record exists
- [X] T026 [US2] Add filter tags UI to `src/list/main.js` — render "全部" / "⭐ 最近玩过" toggle buttons above grid
- [X] T027 [US2] Implement filter logic in `src/list/main.js` — when "最近玩过" active, filter games by play history and sort by lastPlayedAt desc
- [X] T028 [US2] Add filter tag styles to `src/list/style.css` — `.filter-tags`, `.filter-tag`, `.filter-tag--active`, `.game-card__recent`
- [X] T029 [US2] Modify `detail-modal.js` — render "⭐ 最近玩过" tag and "上次游玩：X" in header when playRecord exists

**Checkpoint**: User Stories 1 AND 2 both work independently — recent play tracking, filtering, and badges all functional

---

## Phase 5: User Story 3 - 快捷键盘操作 (Priority: P3)

**Goal**: 详情浮层支持 Enter 键快速开始游戏。

**Independent Test**: 打开详情浮层 → 按 Enter → 新标签页打开游戏运行页。

**Note**: ESC 关闭浮层已在 US1 中实现，本阶段仅新增 Enter 开始游戏的键盘快捷方式。

### E2E Tests for User Story 3

- [X] T030 [P] [US3] Write E2E test "Enter键开始游戏" in `tests/e2e/detail-modal.spec.js`

### Implementation for User Story 3

- [X] T031 [US3] Modify `src/list/detail-modal.js` — add `keydown` listener in `open()`: Enter triggers start game (calls same handler as "开始游戏" button click)
- [X] T032 [US3] Modify `src/list/detail-modal.js` — add `e.preventDefault()` / `e.stopPropagation()` to prevent event bubbling to search input
- [X] T033 [US3] Modify `src/list/detail-modal.js` — auto-focus "开始游戏" button on open (`startBtn.focus()`), support Tab key navigation between close button → controls → start button

- [X] T034 [P] Verify edge cases from spec.md in `src/list/detail-modal.js` — rapid double-click resets modal state correctly, ROM name with special characters decoded via `decodeURIComponent`, browser back button from game page restores list without stale modal

**Checkpoint**: All user stories independently functional — keyboard shortcuts work alongside mouse/touch interactions

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and quality checks

- [X] T035 [P] Run `npx vitest run` — verify all unit tests pass
- [X] T036 [P] Run `npx playwright test tests/e2e/detail-modal.spec.js` — verify all E2E tests pass
- [X] T037 Run manual validation per `quickstart.md` — all 3 scenarios
- [X] T038 [P] Performance check (SC-001): in Chrome DevTools Performance panel, record click event → measure time from `click` to first paint of `.detail-modal` (Layout/Paint composite). Repeat 5 times, take P95 value, confirm <200ms. Report methodology and results in console log or PR comment
- [X] T039 Verify no console errors or warnings during modal open/close interactions
- [X] T040 Verify `detail-modal.css` z-index (210) does not conflict with existing elements (max z-index in list page is 100)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — create empty files
- **Foundational (Phase 2)**: Depends on Setup — implement play-history + relative-time + unit tests
- **User Story 1 (Phase 3)**: Depends on Foundational — detail modal core functionality
- **User Story 2 (Phase 4)**: Depends on US1 + Foundational — recent play features (builds on modal)
- **User Story 3 (Phase 5)**: Depends on US1 + Foundational — keyboard shortcuts (builds on modal)
- **Polish (Phase 6)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories — can start after Foundational
- **US2 (P2)**: Depends on US1 (modal must exist to show recent badge) — starts after US1
- **US3 (P3)**: Depends on US1 (modal must exist for keyboard events) — can start in parallel with US2

### Within Each User Story

- E2E tests written first (they will fail), then implementation
- CSS before JS (modal styles before modal logic)
- Core modal before list/main.js integration
- list/main.js modifications last (they depend on modal module)

### Parallel Opportunities

- **Phase 1**: All file creation tasks (T002-T005) run in parallel
- **Phase 2**: play-history.js, relative-time.js, and their tests (T006-T011) run in parallel
- **Phase 3**: E2E tests (T012-T015) and CSS implementation (T016) run in parallel
- **Phase 4**: E2E tests (T021-T023) can be written while US3 is being implemented
- **Phase 5**: T030 and T031 (E2E tests) run in parallel
- **Phase 6**: T035, T036, T038 (tests and performance) run in parallel

---

## Parallel Example: User Story 1

```bash
# E2E tests and CSS can be written in parallel:
Task: "Write E2E tests for detail modal in tests/e2e/detail-modal.spec.js"
Task: "Implement detail-modal.css styles"

# After tests exist and CSS is ready:
Task: "Implement createDetailModal() in src/list/detail-modal.js"

# After detail-modal.js is ready:
Task: "Wire detail modal into src/list/main.js"
Task: "Add CSS link to index.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (create empty files)
2. Complete Phase 2: Foundational (play-history + relative-time + tests)
3. Complete Phase 3: User Story 1 (detail modal core)
4. **STOP and VALIDATE**: Run E2E tests, manual quickstart scenario 1
5. Deploy/demo if ready — players can preview games before launching

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test independently → MVP demo (detail modal works)
3. User Story 2 → Test independently → Recent play tracking + filtering
4. User Story 3 → Test independently → Keyboard shortcuts
5. Polish → All tests pass, performance validated

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable
- Commit after each phase or logical task group
- Stop at any checkpoint to validate story independently
