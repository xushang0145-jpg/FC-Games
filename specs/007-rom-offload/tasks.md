# Tasks: ROM 迁出 Git 与部署优化

**Input**: Design documents from `specs/007-rom-offload/`

**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: `npx vitest run`、`npx playwright test`、`npm run build`

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Foundational（迁出 ROM + 下载脚本）

**Purpose**: 完成 ROM 从 Git 迁出的基础能力

**⚠️ CRITICAL**: 所有用户故事都依赖本阶段的文件

- [ ] T001 [P] [US1] 更新 `.gitignore`：新增 `roms/` 忽略规则
- [ ] T002 [P] [US1] 生成 `roms/manifest.json`：记录当前 88 个 ROM 的 sha256 和 size
- [ ] T003 [P] [US1] 创建 `scripts/download-roms.js`：从 `ROM_BASE_URL` 下载并校验 ROM
- [ ] T004 [P] [US1] 更新 `package.json`：添加 `download:roms` 脚本
- [ ] T005 [P] [US2] 更新 `vite.config.js`：增强 `copyRomsPlugin` 日志，保持复制行为不变

**Checkpoint**: 本地可执行 `npm run download:roms` 下载 ROM，`npm run build` 产物包含 ROM

---

## Phase 2: User Story 1 - ROM 不再污染 Git 历史

**Goal**: `git clone` 不再携带 ROM，仓库体积回归代码大小

**Independent Test**: 新目录浅克隆后确认 `roms/` 为空；运行下载脚本后 88 个 ROM 就位

### Implementation for User Story 1

- [ ] T006 [US1] 验证 `.gitignore` 生效：`git status` 不显示 `roms/*.nes`
- [ ] T007 [US1] 创建 `docs/rom-offload.md` 运维文档：包含上传 CDN、本地开发、历史清理步骤

**Checkpoint**: ROM 不再进入 Git 索引，文档齐全

---

## Phase 3: User Story 2 - Vite build 仍能复制/引用 ROM

**Goal**: 迁出后现有构建和前端引用方式继续有效

**Independent Test**: 清空 `roms/` → 下载 → 构建 → preview → 游玩

### Implementation for User Story 2

- [ ] T008 [US2] 验证 `npm run build` 产物 `dist/roms/` 包含 88 个 `.nes`
- [ ] T009 [US2] 验证 `npm run preview` 可加载任意游戏
- [ ] T010 [US2] 验证 `import.meta.glob('/roms/*.nes')` 在 dev 和 build 后均正常

**Checkpoint**: 业务代码无需修改，ROM 加载路径完整

---

## Phase 4: User Story 3 - CI/CD 集成 ROM 下载与性能基准

**Goal**: CI 自动下载 ROM 并运行基础性能测试

**Independent Test**: 推送分支，查看 GitHub Actions 日志

### Implementation for User Story 3

- [ ] T011 [P] [US3] 更新 `.github/workflows/ci.yml`：新增 `setup-roms` 步骤
- [ ] T012 [P] [US3] 创建 `tests/perf/rom-load.perf.spec.js`：测量 ROM 加载时间
- [ ] T013 [P] [US3] 更新 `.github/workflows/ci.yml`：新增 `perf` job
- [ ] T014 [US3] 验证 CI 中性能基准通过

**Checkpoint**: CI 自动下载 ROM，性能测试作为独立 job 运行

---

## Phase 5: User Story 4 - Release 流程适配

**Goal**: Release 附件包含完整 ROM

**Independent Test**: 推送 tag，下载 Release 附件验证

### Implementation for User Story 4

- [ ] T015 [US4] 更新 `.github/workflows/release.yml`：构建前下载 ROM
- [ ] T016 [US4] 评估 Release 流程是否需要拆分包体，在文档中记录结论
- [ ] T017 [US4] 验证本地 `npm run build` 后 zip/tar.gz 包含 `dist/roms/`

**Checkpoint**: Release 流程适配完成，文档记录评估结论

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 最终验证和提交

- [ ] T018 运行 `npm test`、`npm run test:e2e`、`npm run build`，全部通过
- [ ] T019 检查 git diff，确保 `roms/*.nes` 不会被提交
- [ ] T020 提交代码并推送分支 `007-rom-offload`
- [ ] T021 在 issue FCG-10 中发布结果评论，标注需老赵审批的重大变更

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies
- **User Story 1 (Phase 2)**: Depends on Phase 1 (T001-T005)
- **User Story 2 (Phase 3)**: Depends on Phase 1 (T003-T005)
- **User Story 3 (Phase 4)**: Depends on Phase 1 (T003-T005)
- **User Story 4 (Phase 5)**: Depends on Phase 1 (T003-T005)
- **Polish (Phase 6)**: Depends on all prior phases

### Parallel Opportunities

- Phase 1: T001, T002, T003, T004, T005 可并行（不同文件）
- Phase 4: T011, T012, T013 可并行

## Implementation Strategy

### MVP First

1. Complete Phase 1: 下载脚本 + `.gitignore` + `manifest.json`
2. Complete Phase 2: 验证 Git 迁出
3. Complete Phase 3: 验证构建和 preview
4. Complete Phase 4: CI 集成 + 性能基准
5. Complete Phase 5: Release 适配
6. STOP and VALIDATE: 本地测试全部通过
7. 提交并推送，在 issue 中汇报

### Single Developer Strategy

单人按以上顺序执行，每个 phase 完成后运行对应验证命令。

## Notes

- 不直接改写 Git 历史，相关步骤写入 `docs/rom-offload.md`
- 性能基准阈值在 CI runner 上可能波动，首次运行后可微调
- 所有中文文件名在 URL 中必须使用 `encodeURIComponent`
- `ROM_BASE_URL` 在本地通过 `.env` 或 shell 导出；在 GitHub 通过 repository variable 设置
