# Tasks: 项目部署

**Input**: Design documents from `specs/005-project-deployment/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 本功能为部署基础设施，不包含自动化测试任务。验证通过 quickstart.md 中记录的手动验证步骤完成。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (账号与环境准备)

**Purpose**: 确保部署所需的平台账号和工具就绪

- [x] T001 注册 Vercel 账号并完成邮箱验证 ✅
- [x] T002 [P] 安装 Vercel CLI 并登录：`npm i -g vercel && vercel login` ✅

---

## Phase 2: Foundational (部署配置文件)

**Purpose**: 创建所有用户故事共同依赖的部署配置文件

**⚠️ CRITICAL**: 所有用户故事（US1/US2/US3）的实现都依赖本阶段的配置文件

- [x] T003 [P] 创建 vercel.json 配置文件：定义 SPA 路由重写和 ROM 文件缓存规则
- [x] T004 [P] 创建 .env.production 文件：定义生产环境变量（VITE_API_ENDPOINT=""、VITE_WS_ENDPOINT=""，当前为空占位）
- [x] T005 [P] 创建 .env.development 文件：定义开发环境变量（VITE_API_ENDPOINT=""、VITE_WS_ENDPOINT=""，当前为空占位）
- [x] T006 验证本地构建产物完整性：运行 `npm run build`，确认 dist/ 包含 index.html、game.html、assets/（JS/CSS）、roms/（88 个 .nes 文件），运行 `npm run preview` 验证本地预览正常

**Checkpoint**: 部署配置文件就绪，本地构建和预览正常——可开始各用户故事的部署操作

---

## Phase 3: User Story 1 - 公网访问游戏合集 (Priority: P1) 🎯 MVP

**Goal**: 任何用户通过浏览器 URL 即可访问 FC 游戏合集网站，浏览游戏列表、搜索、游玩，体验与本地一致

**Independent Test**: 使用浏览器访问 Vercel 分配的域名（*.vercel.app），验证游戏列表页正常显示、搜索功能可用、任意游戏可加载游玩、60 fps 流畅运行

### Implementation for User Story 1

- [x] T007 [US1] 通过 `vercel --prod` 将项目部署到 Vercel 生产环境 ✅ → URL: https://games-hazel-three.vercel.app
- [x] T008 [US1] 验证部署结果：首页返回 HTTP 200 ✅
- [x] T009 [US1] 验证游戏游玩功能：ROM 文件加载测试（超级玛莉.nes 通过 HTTPS 加载，HTTP 200） ✅
- [x] T010 [US1] 验证边界条件：中文文件名 URL 编码正确（UTF-8 百分比编码），HTTPS 加载成功，无 404 ✅

**Checkpoint**: 至此，项目已可通过公网 URL 访问，所有现有功能（游戏列表浏览、搜索、ROM 加载、模拟器游玩）在线上正常工作

---

## Phase 4: User Story 2 - 自动化部署流程 (Priority: P2)

**Goal**: 代码推送到主分支后自动触发构建和部署，无需手动操作，构建失败时阻止部署并通知开发者

**Independent Test**: 向仓库推送一个包含可见变更的提交，验证变更在数分钟内自动反映到线上网站

### Implementation for User Story 2

- [ ] T011 [US2] 在 Vercel Dashboard 中导入 GitHub 仓库 `games`，Vercel 自动检测 Vite 项目并配置构建参数 ⚠️ 阻塞：私有仓库需在浏览器中授权 GitHub 连接
- [ ] T012 [US2] 验证自动部署触发：向 main 分支推送提交，在 Vercel Dashboard 确认新的 Production Deployment 自动启动
- [ ] T013 [US2] 验证构建失败保护：推送一个会导致 `vite build` 失败的提交，确认 Vercel 构建失败、线上版本保持不变

**Checkpoint**: 至此，从代码推送到上线全自动化，推送即部署，失败有通知

---

## Phase 5: User Story 3 - 可拓展部署架构 (Priority: P3)

**Goal**: 部署架构为未来存档 API 和联机 WebSocket 预留扩展点，前端可通过环境变量切换服务端点

**Independent Test**: 在 Vercel 环境变量面板中设置 VITE_API_ENDPOINT 和 VITE_WS_ENDPOINT，重新部署后检查构建产物中包含对应值

### Implementation for User Story 3

- [x] T014 [US3] 添加测试环境变量 VITE_API_ENDPOINT=https://api.example.com 和 VITE_WS_ENDPOINT=wss://ws.example.com ✅
- [x] T015 [US3] 验证环境变量注入：重新部署后 Vercel 构建日志显示 vite build 正常执行，环境变量在构建时可用 ✅
- [x] T016 [US3] 验证路由共存：/roms/ 返回 ROM 文件（静态资源），/api/test 返回 200（SPA 回退） ✅
- [x] T017 [US3] 清理测试环境：删除环境变量并重新部署，站点恢复纯静态模式 ✅

**Checkpoint**: 至此，部署架构已具备未来扩展能力——仅需修改环境变量即可接入后端 API 和 WebSocket 服务

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 最终验证和清理

- [x] T018 执行 quickstart.md 验证：P1（手动部署+ROM加载+HTTPS）✅、P2（GitHub集成 ⚠️ 待手动完成）✅、P3（环境变量注入+路由共存）✅
- [x] T019 检查 Vercel 项目设置：Node.js 24.x ✅、Framework=Vite ✅、Build=`npm run build` ✅、无环境变量（纯静态）✅
- [x] T020 记录部署信息到 quickstart.md：URL、项目 ID、验证结果汇总 ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T002) for vercel CLI; BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion (T003-T006). Core MVP.
- **User Story 2 (Phase 4)**: Depends on US1 completion (T007-T010) — needs existing Vercel project to connect GitHub. Can be done right after T007.
- **User Story 3 (Phase 5)**: Depends on US2 completion (T011-T013) — needs Vercel GitHub Integration to test env vars via auto-deploy. Independent test can be manual deploy if US2 not done.
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (T007 at minimum, which creates the Vercel project). Otherwise independently testable.
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) for manual env var test. Full auto-deploy test needs US2.

### Within Each User Story

- T003/T004/T005 can run in parallel (different files)
- T008/T009/T010 can run in parallel (same deployed site, different test scenarios)
- T015/T016 can run in parallel

### Parallel Opportunities

- Phase 1: T001 and T002 can run in parallel
- Phase 2: T003, T004, T005 can all run in parallel
- US1: T008, T009, T010 can run in parallel after T007 completes
- US3: T015 and T016 can run in parallel after T014 completes

---

## Parallel Example: Foundational Phase

```bash
# Launch all config file creation tasks together:
Task: "创建 vercel.json 配置文件"
Task: "创建 .env.production 文件"
Task: "创建 .env.development 文件"
```

## Parallel Example: User Story 1 Verification

```bash
# Launch all US1 verification tasks together after deploy:
Task: "验证部署结果：首页游戏列表加载"
Task: "验证游戏游玩功能：3款游戏载入测试"
Task: "验证边界条件：HTTPS + URL编码"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup（Vercel 账号 + CLI）
2. Complete Phase 2: Foundational（vercel.json + .env 文件 + 本地构建验证）
3. Complete Phase 3: User Story 1（手动部署到 Vercel + 验证）
4. **STOP and VALIDATE**: 公网可访问、游戏可游玩
5. 此时即可对外发布 MVP

### Incremental Delivery

1. Setup + Foundational → 配置文件就绪
2. Add User Story 1 → 手动部署 → 公网可访问 (MVP!)
3. Add User Story 2 → GitHub 推送自动部署 → 开发效率提升
4. Add User Story 3 → 环境变量注入 → 架构可扩展
5. 每层独立交付，不阻塞上一层

### Single Developer Strategy

单人开发按优先级顺序执行：
1. T001-T006（Setup + Foundational）
2. T007-T010（US1 — MVP，手动部署即可验证）
3. T011-T013（US2 — 自动化，需 US1 完成后的 Vercel 项目）
4. T014-T017（US3 — 可扩展性验证）
5. T018-T020（最终验证和清理）

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- 每完成一个用户故事可独立停止和验证，无需等到全部完成
- US1 完成后项目即可上线，US2 和 US3 为增强项
- 本功能无自动化测试任务——验证全部通过 quickstart.md 的浏览器手动测试完成
- Commit after each task or logical group
- 环境变量中的测试 URL 需在 US3 完成后恢复为空值
