# Implementation Plan: ROM 迁出 Git 与部署优化

**Branch**: `007-rom-offload` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-rom-offload/spec.md`

## Summary

将 `roms/` 目录从 Git 仓库中迁出，改为由 CDN（推荐 Cloudflare R2）托管；通过 `scripts/download-roms.js` 在本地开发和 CI/CD 中按需拉取 ROM；保持 `vite.config.js` 的 `copyRomsPlugin` 逻辑不变；在 CI 中新增 Playwright 性能基准测试作为基础版性能门禁；评估并调整 Release 流程确保 Release 附件包含完整 ROM。

## Technical Context

**Language/Version**: JavaScript ES Modules（现有项目，无需变更）

**Primary Dependencies**: `vite@^5.4.21`、`@playwright/test@^1.52.0`、原生 Node.js `fs` / `crypto` / `https`

**Storage**: Cloudflare R2（S3 兼容对象存储，推荐）或阿里云 OSS；通过环境变量 `ROM_BASE_URL` 访问

**Testing**: `npx vitest run` + `npx playwright test`（现有测试套件），新增 `tests/perf/rom-load.perf.spec.js`

**Target Platform**: GitHub Actions CI、本地开发环境、Vercel/静态托管生产环境

**Performance Goals**: 首页 LCP ≤ 2.5s、单个 ROM 加载 ≤ 3s

**Constraints**:
- 不修改业务代码（`src/` 目录不变）
- 不引入新的运行时依赖
- 不直接改写 Git 历史（仅做准备和文档）
- 重大线上变更需经老赵审批

**Scale/Scope**: 88 个 ROM 文件、约 15MB、低频更新

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. 规范驱动开发 (SDD) | ✅ PASS | spec.md 已完成 |
| II. 方案即契约 | ✅ PASS | 本 plan.md 是实现的唯一依据 |
| III. 渐进交付与独立可测 | ✅ PASS | P1（迁出+下载脚本+CI）→ P2（性能基准+Release），每层可独立验证 |
| IV. 性能即功能 | ✅ PASS | 性能基准作为 CI 门禁，ROM 加载路径不变，不影响 60 fps |
| V. 简洁优先 (YAGNI) | ✅ PASS | 不引入 S3 SDK、不新增后端服务、不做过度抽象的 CDN 适配层 |

**Gate Result**: 全部通过，无违规项。

## ROM 托管方案选型

### 方案对比

| 维度 | Git LFS | CDN（Cloudflare R2） | 结论 |
|------|---------|----------------------|------|
| Git 历史体积 | 仍需 LFS 指针，历史仍会引用大文件 | 完全迁出，历史干净 | CDN 优 |
| 版权合规 | 文件仍在 Git 生态内 | 文件独立管理，可单独配置访问/下架 | CDN 优 |
| CI 拉取 | 需安装 git-lfs，消耗 GitHub LFS 带宽 | 直接 HTTPS 下载，R2 出站免费 | CDN 优 |
| 本地开发 | 需 git lfs pull | `npm run download:roms` | 相当 |
| 生产加载 | 与代码同域 | 可配置独立域名/CDN | CDN 优 |
| 成本 | Git LFS 按带宽计费 | R2 免费额度高（10GB/月） | CDN 优 |
| 复杂度 | 低 | 中（需上传脚本+环境变量） | Git LFS 略低 |

**推荐方案**: CDN（Cloudflare R2）

- ROM 彻底脱离 Git，解决 clone 体积和版权合规问题
- R2 与 S3 API 兼容，无需专用 SDK，可用 Node.js 原生 `https` 下载
- 出站流量免费额度充足，适合当前 15MB 规模
- 未来如需切换阿里云 OSS，只需改 `ROM_BASE_URL`，脚本无需改动

## Migration Strategy

### 第一阶段：P1 MVP（本 issue 必须完成）

1. 将 `roms/` 加入 `.gitignore`
2. 生成 `roms/manifest.json`（基于当前 88 个 ROM 的 SHA-256）
3. 创建 `scripts/download-roms.js` 下载脚本
4. 在 `package.json` 添加 `download:roms` 脚本
5. 更新 `vite.config.js`：保持 `copyRomsPlugin` 行为，但增加 ROM 存在性检查日志
6. 更新 `.github/workflows/ci.yml`：在测试/构建前下载 ROM
7. 更新 `.github/workflows/release.yml`：在构建前下载 ROM
8. 创建 `docs/rom-offload.md` 运维文档

### 第二阶段：P2 增强（本 issue 完成基础版）

1. 创建 `tests/perf/rom-load.perf.spec.js` 性能基准测试
2. 在 CI 中新增 `perf` job
3. 验证 Release 附件包含 ROM

### 第三阶段：后续独立操作（不在本 issue）

1. 上传 ROM 到 Cloudflare R2 并配置 `ROM_BASE_URL`
2. 使用 `git filter-repo` 清理 Git 历史中的 ROM blob
3. 在 GitHub 仓库设置 `ROM_BASE_URL` secret/variable

## Project Structure

### Documentation (this feature)

```text
specs/007-rom-offload/
├── spec.md                 # 本功能规范
├── plan.md                 # 本文件
├── tasks.md                # 可执行任务
├── contracts/
│   └── rom-offload-contract.md   # ROM 路径/环境变量契约
└── ...

docs/
├── rom-offload.md          # 运维文档：上传 CDN、本地开发、CI 配置、历史清理
```

### Source Code (repository root)

```text
.
├── .gitignore              # [修改] 忽略 roms/ 目录
├── package.json            # [修改] 新增 download:roms 脚本
├── vite.config.js          # [修改] copyRomsPlugin 增强日志
├── scripts/
│   └── download-roms.js    # [新建] ROM 下载与校验脚本
├── roms/
│   └── manifest.json       # [新建] ROM 清单（sha256 + size）
├── .github/
│   └── workflows/
│       ├── ci.yml          # [修改] 新增 ROM 下载与性能基准 job
│       └── release.yml     # [修改] 构建前下载 ROM
└── tests/perf/
    └── rom-load.perf.spec.js   # [新建] ROM 加载性能基准
```

### ROM 存储（外部 CDN）

```text
https://<ROM_BASE_URL>/
├── 超级玛莉.nes
├── 魂斗罗.nes
├── ...
└── manifest.json   （可选，脚本优先使用仓库内清单）
```

## Key Contracts

### 环境变量

- `ROM_BASE_URL`: ROM CDN 前缀，**必须**以 `https://` 开头，**不**以 `/` 结尾
  - 正确: `https://roms.example.com/fc-games`
  - 错误: `https://roms.example.com/fc-games/`

### ROM 清单 `roms/manifest.json`

```json
{
  "version": 1,
  "generatedAt": "2026-06-13T00:00:00Z",
  "files": [
    { "name": "超级玛莉.nes", "sha256": "...", "size": 40976 }
  ]
}
```

### 下载脚本行为

- 读取 `roms/manifest.json`
- 若 `roms/` 中文件已存在且 SHA-256 匹配，跳过下载
- 否则从 `${ROM_BASE_URL}/${encodeURIComponent(name)}` 下载
- 下载完成后重新校验 SHA-256，失败则退出码 1
- 缺少 `ROM_BASE_URL` 时直接报错退出

### Vite 构建行为

- `copyRomsPlugin.closeBundle` 仅在 `roms/` 存在时复制 `.nes` 到 `dist/roms/`
- 若 `roms/` 不存在或为空，打印警告但不失败（兼容未来纯 CDN 加载模式）

## Risk & Mitigation

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| ROM 未上传到 CDN 导致 CI 失败 | 高 | 文档中明确上传 checklist；CI 下载失败时提供清晰错误信息 |
| 中文文件名 URL 编码不一致 | 中 | 下载脚本使用 `encodeURIComponent`；清单中保留原始文件名 |
| 性能基准在 CI runner 上不稳定 | 中 | 阈值留有余量；使用 Playwright 多次采样取中位数 |
| Git 历史仍有 ROM blob | 中 | 文档记录后续 `git filter-repo` 步骤，不直接在本 issue 执行 |
| 老赵审批延迟 | 中 | 方案文档完成后先提交 PR，明确标注需审批 |

## Complexity Tracking

> 无违规项，本表为空。
