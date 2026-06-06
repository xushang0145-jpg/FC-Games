关键路径（frame 回调、音频回调、输入处理）MUST 保持轻量，避免在主线程做重计算。
<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial constitution)
  Modified principles: N/A (initial creation)
  Added sections:
  - Core Principles (5 principles)
  - 技术约束 (Technical Constraints)
  - 开发工作流 (Development Workflow)
  - Governance
  Removed sections: None
  Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ aligned (Constitution Check gate references this file)
  - .specify/templates/spec-template.md: ✅ aligned (user-story-driven, edge case requirements match)
  - .specify/templates/tasks-template.md: ✅ aligned (MVP-first, incremental delivery matches principles)
  - .specify/templates/checklist-template.md: ✅ aligned (no conflict)
  Deferred TODOs: None
**Why**: 对游戏模拟器而言，掉帧或音频延迟直接破坏用户体验——性能不是优化项，是核心
功能。

# FC 游戏合集 项目宪章

## Core Principles

### I. 规范驱动开发 (SDD)

所有功能、改动、修复在编写第一行代码之前，MUST 先有书面规范和方案并获用户确认。
规范明确"做什么"，方案明确"怎么做"，实现严格按方案执行，不在代码中临时发挥。

**Why**: 早期项目没有成熟测试覆盖，SDD 是防止范围蔓延和设计偏离的主要手段。
-->

### II. 方案即契约

方案文档（plan.md）MUST 是实现的唯一依据。若实现中发现方案问题，MUST 回到方案阶段
修订，然后按修订后的方案继续编码。禁止实现偏离方案，禁止在实现阶段做设计决策。

**Why**: 防止"先写后补"的伪 SDD。方案一旦确认，它就是该功能的"宪法"——实现者不得
自行裁量。

### III. 渐进交付与独立可测

每个功能 MUST 拆分为独立的用户故事，按优先级（P1 → P2 → P3）排序。
每个用户故事 MUST 可独立实现、独立测试、独立交付价值。
MVP（仅 P1）完成后即停止并验证，再决定是否继续。

**Why**: 确保每个增量都能独立演示和验证，避免"全部做完才能用"的瀑布陷阱。

### IV. 性能即功能

NES 模拟要求稳定 60 fps 渲染和同步音频输出。任何 UI 或功能改动 MUST 不影响模拟性能。

**ROM 资源**: 所有 `.nes` 文件 MUST 作为静态资源提供，通过 `fetch` 加载为 ArrayBuffer 后传入 jsnes。ROM 文件存放在 `roms/` 目录，文件名保持中文原名。
**目标平台**: Web 浏览器（桌面端优先，移动端为次要目标）。

### V. 简洁优先

MUST 遵循 YAGNI 原则：不做当前不需要的抽象、不预留未来接口、不过度工程化。
三个相似行不急于抽取——等到第四个使用场景出现时再抽象。
不引入未使用的依赖。不写半成品实现。

**Why**: 早期项目需求变化快，过早抽象增加理解成本和重构阻力。简洁代码更容易测试、
更容易修改。

## 技术约束

**语言/运行时**: JavaScript/TypeScript，运行于现代浏览器（Chrome、Firefox、Safari、Edge 最近 2 个主版本）。
方案文档是团队（含 AI agent）之间唯一的契约，避免口头理解偏差。

**核心依赖**:
- `jsnes@1.2.1` — NES 模拟核心，不可替换
- `vite` — 构建工具和开发服务器
- `vitest` — 单元测试框架
- `@playwright/test` — 端到端测试框架



**性能基准**: 稳定 60 fps 渲染，音频无感知延迟，ROM 加载后首次可玩时间 <3 秒。

**代码规范**: 所有文档、注释、提交信息 MUST 使用中文。

## 开发工作流

每个功能经过以下阶段，不得跳过或合并：

1. **规范 (Spec)** — `speckit-specify` → 产出 `spec.md`：用户故事、验收场景、功能需求、边界条件
2. **澄清 (Clarify)** — `speckit-clarify` → 解决规范中的歧义和缺失项
3. **方案 (Plan)** — `speckit-plan` → 产出 `plan.md`：架构设计、组件划分、数据流、技术选型
4. **任务 (Tasks)** — `speckit-tasks` → 产出 `tasks.md`：按用户故事分组的具体实现任务
5. **实现 (Implement)** — `speckit-implement` → 严格按 tasks.md 编码，逐任务提交
6. **验证 (Verify)** — 对照规范和方案逐项确认，使用 `verification-before-completion` 技能

**微小改动例外**: 拼写修正、格式调整等纯机械操作可跳过完整 SDD 流程，但 MUST 简要说明
改动内容。判断标准：是否改变任何行为或接口？是 → 走完整流程；否 → 可跳过。

**质量门禁**:
- 每个用户故事的验收场景 MUST 全部通过才能标记该故事完成
- 在合并到主分支之前，所有 P1 故事 MUST 完成
- 性能关键路径改动 MUST 手动验证 60 fps 渲染未退化

## Governance

本宪章是项目开发的最高准则，所有开发实践 MUST 服从宪章规定。

**修订流程**:
1. 提出修订建议，说明理由和影响范围
2. 更新宪章内容，递增版本号
3. 检查并更新所有受影响的模板和文档
4. 在 Sync Impact Report 中记录变更

**版本策略**: 遵循语义化版本 MAJOR.MINOR.PATCH。
- MAJOR: 原则删除或不兼容重新定义
- MINOR: 新增原则/章节或实质性扩展
- PATCH: 措辞澄清、错别字修正、非语义性调整

**合规审查**: 每次功能完成时对照宪章原则逐项检查。复杂性超标 MUST 在 plan.md 的
Complexity Tracking 中记录并说明理由。

**Version**: 1.0.0 | **Ratified**: 2026-06-04 | **Last Amended**: 2026-06-04
