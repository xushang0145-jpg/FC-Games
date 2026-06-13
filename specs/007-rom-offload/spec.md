# Feature Specification: ROM 迁出 Git 与部署优化

**Feature Branch**: `007-rom-offload`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "80+ 个 ROM 文件（约 30MB）直接存在 Git 仓库，导致 clone 体积膨胀且存在版权合规风险。需要迁出 Git 并接入 CI/CD 优化。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ROM 不再污染 Git 历史 (Priority: P1)

新克隆仓库时不再下载 ROM 文件；开发者/CI 在需要时可按明确命令从外部存储拉取 ROM。仓库体积回归代码本身大小，版权资产与源代码解耦。

**Why this priority**: 这是本功能的核心目标——解决 clone 体积膨胀和版权合规风险，其他所有优化都建立在此之上。

**Independent Test**: 在新目录执行 `git clone --depth 1` 后确认 `roms/` 目录为空或不存在；执行 `npm run download:roms` 后 `roms/` 出现 88 个 `.nes` 文件。

**Acceptance Scenarios**:

1. **Given** 新用户执行浅克隆，**When** 克隆完成，**Then** `roms/` 目录为空，仓库大小接近代码体积
2. **Given** 本地开发环境已配置 `ROM_BASE_URL`，**When** 执行 `npm run download:roms`，**Then** 所有 ROM 文件下载到 `roms/` 且校验通过
3. **Given** CI 构建流程，**When** 触发 `npm ci`，**Then** 构建前自动下载 ROM，构建产物 `dist/roms/` 包含全部 ROM
4. **Given** Release 流程，**When** 推送 tag，**Then** 打包的 zip/tar.gz 包含 `dist/roms/`

---

### User Story 2 - Vite build 仍能复制/引用 ROM (Priority: P1)

ROM 迁出 Git 后，现有的 `vite.config.js` 复制逻辑和前端 `import.meta.glob('/roms/*.nes')` 引用方式继续有效，无需修改业务代码。

**Why this priority**: P1 必须保证迁出 Git 不影响现有构建和运行方式，否则无法独立交付。

**Independent Test**: 清空 `roms/` 后执行 `npm run download:roms && npm run build`，确认 `dist/roms/` 存在 88 个 `.nes` 文件；启动 `npm run preview` 可正常游玩任意游戏。

**Acceptance Scenarios**:

1. **Given** `roms/` 本地为空，**When** 执行下载脚本后构建，**Then** `dist/roms/` 包含全部 ROM
2. **Given** 构建产物已生成，**When** 启动 preview 并访问游戏页面，**Then** `/roms/中文文件名.nes` 返回 200 且模拟器加载成功
3. **Given** 开发者本地已有 `roms/` 文件，**When** 执行构建，**Then** 直接使用本地 ROM，无需重复下载

---

### User Story 3 - CI/CD 集成 ROM 下载与性能基准 (Priority: P2)

CI 流程在测试和构建前自动准备 ROM；同时引入基础性能测试，覆盖首页加载时间和单个 ROM 加载时间，作为部署前门禁。

**Why this priority**: 自动化是减少人工操作风险的关键；性能基准确保迁出方案不会退化用户体验。属于 M1 内可完成的基础版。

**Independent Test**: 推送一个 commit 到分支，观察 GitHub Actions 日志：CI 下载 ROM、运行测试、运行性能基准、构建产物完整。

**Acceptance Scenarios**:

1. **Given** 向 main 分支推送提交，**When** CI 运行，**Then** `Setup ROMs` 步骤在测试/构建之前完成
2. **Given** CI 运行到性能测试步骤，**When** Playwright 性能基准执行，**Then** 输出首页 LCP 和单个 ROM 加载时间
3. **Given** 性能测试失败，**When** 指标超过阈值，**Then** CI 失败并阻止合并

---

### User Story 4 - Release 流程适配 (Priority: P2)

Release workflow 在构建前自动下载 ROM，确保 GitHub Release 附件包含完整 ROM；同时评估是否需要调整打包策略。

**Why this priority**: Release 是生产交付入口，必须保证 ROM 完整；评估是否需要拆分包体或提供无 ROM 包属于优化项。

**Independent Test**: 推送 `v*` tag，下载 Release 附件并解压，确认 `roms/` 目录存在且文件完整。

**Acceptance Scenarios**:

1. **Given** 推送 tag `v1.2.0`，**When** Release workflow 完成，**Then** zip/tar.gz 附件包含 `dist/roms/`
2. **Given** Release 附件下载完成，**When** 本地解压并静态托管，**Then** 游戏列表和模拟器均可正常工作

---

### Edge Cases

- ROM 下载失败时（网络、URL 配置错误、校验失败），构建必须明确失败而不是使用空目录静默通过
- 部分 ROM 缺失时，构建应失败或给出清晰警告，避免产物不完整
- 中文文件名 ROM 在 CDN URL 和本地文件系统中的编码一致性
- 本地开发时若 `roms/` 已存在，下载脚本应跳过或支持 `--force` 覆盖
- CDN 流量成本：88 个 ROM 共 15MB，CI 每次构建下载约 15MB，需考虑缓存策略
- Git 历史中的 ROM blob 需要后续使用 `git filter-repo` 或 BFG 彻底清理（本 issue 仅做未来清理的脚本/文档准备，不直接改写历史）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `roms/` 目录 MUST 被 `.gitignore` 忽略，不再进入 Git 索引
- **FR-002**: 必须提供 `npm run download:roms` 脚本，按 `ROM_BASE_URL` 环境变量从 CDN 下载全部 ROM
- **FR-003**: 下载脚本 MUST 校验每个 ROM 的 SHA-256（通过 `roms/manifest.json`），失败时退出非零
- **FR-004**: CI workflow MUST 在 `npm ci` 之后、测试/构建之前执行 ROM 下载
- **FR-005**: Release workflow MUST 在构建前执行 ROM 下载
- **FR-006**: `vite.config.js` 的 `copyRomsPlugin` 行为 MUST 保持不变：若 `roms/` 存在则复制到 `dist/roms/`
- **FR-007**: 必须新增 Playwright 性能基准测试，覆盖首页 Largest Contentful Paint（LCP ≤ 2.5s）和单个 ROM 加载时间（≤ 3s）
- **FR-008**: 性能基准 MUST 在 CI 中作为独立 job 运行，失败时阻止合并
- **FR-009**: 必须提供 `roms/manifest.json` 作为 ROM 清单（文件名 + SHA-256 + 大小）
- **FR-010**: 必须提供 `docs/rom-offload.md` 运维文档，说明 ROM 上传 CDN、本地开发、CI 配置、历史清理步骤

### Non-Functional Requirements

- **NFR-001**: 迁出后 `git clone --depth 1` 的代码体积应 < 5MB（当前代码部分）
- **NFR-002**: CI 下载 ROM 步骤应在 60 秒内完成（假设 CDN 带宽 ≥ 1MB/s）
- **NFR-003**: 性能基准测试不应显著增加 CI 总时长（目标 < 3 分钟）
- **NFR-004**: 所有新增脚本 MUST 使用原生 Node.js API，不引入额外运行时依赖

### Key Entities

- **ROM 清单 (`roms/manifest.json`)**: 记录每个 ROM 文件名、SHA-256、字节大小，是下载、校验、构建依赖的唯一事实来源
- **下载脚本 (`scripts/download-roms.js`)**: Node.js ESM 脚本，负责从 `ROM_BASE_URL` 拉取 ROM 并校验
- **CDN 基础 URL (`ROM_BASE_URL`)**: 环境变量，指向 ROM 存储桶的公共访问前缀，例如 `https://roms.example.com/fc-games`
- **性能基准 (`tests/perf/rom-load.perf.spec.js`)**: Playwright 测试，测量 ROM 加载耗时

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `git clone --depth 1` 后仓库代码部分 < 5MB
- **SC-002**: `npm run download:roms` 在 60 秒内完成 88 个 ROM 下载并全部校验通过
- **SC-003**: `npm run build` 产物 `dist/roms/` 包含 88 个 `.nes` 文件
- **SC-004**: CI 流程中 ROM 下载、单元测试、性能基准、构建全部通过
- **SC-005**: 首页 LCP ≤ 2.5s，单个 ROM 加载时间 ≤ 3s（在 GitHub Actions runner 的 Chromium 上）
- **SC-006**: Release 附件 zip/tar.gz 解压后 `dist/roms/` 包含全部 ROM
- **SC-007**: 文档 `docs/rom-offload.md` 可被新开发者按步骤复现本地环境与 CI 配置

## Dependencies

- 需要选择一个 CDN 存储服务（Cloudflare R2 / 阿里云 OSS / AWS S3 兼容）并上传 ROM
- 需要仓库 owner 提供 `ROM_BASE_URL` 和对应的 ROM 上传权限
- 当前已有 Playwright 测试框架，可直接复用

## Assumptions

- ROM 文件本身的内容不会频繁变更，清单更新频率低
- CDN 存储桶支持通过公开 HTTPS URL 直接访问单个文件
- GitHub Actions runner 可访问公共互联网和 CDN
- 本地开发时开发者会自行准备 `roms/`（通过下载脚本或手动放置）
- 彻底清理 Git 历史中的 ROM blob 属于后续独立操作，不在本 issue 范围内
