# Implementation Plan: 项目部署

**Branch**: `005-project-deployment` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-project-deployment/spec.md`

## Summary

将 FC 游戏合集网站（纯静态 Vite 项目）部署到 Vercel 平台，实现公网可访问、GitHub 推送自动构建部署、以及为未来存档/联机功能预留 Serverless 后端接入能力。部署架构采用 "静态资源 CDN + Serverless Function 预留" 模式，前端环境变量注入 API/WebSocket 端点配置。

## Technical Context

**Language/Version**: JavaScript ES Modules（现有项目，无需变更）

**Primary Dependencies**: `jsnes@1.2.1`（不可替换）、`vite@^5.4.21`（构建工具）、`vitest@^3.1.4`（单元测试）、`@playwright/test@^1.52.0`（E2E 测试）

**Storage**: N/A（纯静态部署，无持久化存储。ROM 文件作为静态资源提供）

**Testing**: `npx vitest run` + `npx playwright test`（现有测试套件）

**Target Platform**: Web 浏览器（Chrome、Firefox、Safari、Edge 最近 2 个主版本），托管平台 Vercel

**Project Type**: Web 应用（纯前端静态 SPA — Vite 构建）

**Performance Goals**: 60 fps 模拟渲染、首屏 <5 秒（含 ROM 列表）、单个 ROM 加载 <3 秒（4G 网络）、Lighthouse Performance ≥90

**Constraints**: 纯静态部署（无服务端运行时）、ROM 文件 88 个共 15MB、资产资源 15MB、中文文件名 ROM 需 URL 兼容

**Scale/Scope**: 单人开发维护、88 款游戏、预计日均访问 <1000 人次

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. 规范驱动开发 (SDD) | ✅ PASS | spec.md 已完成并通过澄清验证 |
| II. 方案即契约 | ✅ PASS | 本 plan.md 是实现的唯一依据 |
| III. 渐进交付与独立可测 | ✅ PASS | P1（手动部署）→ P2（CI/CD）→ P3（架构预留），每层可独立交付和验证 |
| IV. 性能即功能 | ✅ PASS | 部署不修改模拟核心代码，不影响 60 fps；Vercel CDN 加速 ROM 分发，反而缩短加载时间 |
| V. 简洁优先 (YAGNI) | ✅ PASS | P3 不创建后端代码，仅预留环境变量配置机制；不引入 Serverless Function 框架依赖 |

**Gate Result**: 全部通过，无违规项。无需 Complexity Tracking。

## Project Structure

### Documentation (this feature)

```text
specs/005-project-deployment/
├── plan.md              # 本文件
├── research.md          # 部署平台选型、URL兼容性、CI/CD设计研究
├── data-model.md        # 环境配置实体、部署产物结构
├── quickstart.md        # 部署验证指南
├── contracts/           # 部署配置契约
│   └── deployment-contract.md
└── tasks.md             # 待 /speckit-tasks 生成
```

### Source Code (repository root)

本功能不新增源代码文件，仅新增/修改以下部署配置文件：

```text
.
├── vercel.json              # [新建] Vercel 部署路由和缓存规则
├── .env.production          # [新建] 生产环境变量（API/WebSocket 端点占位）
├── .env.development         # [新建] 开发环境变量（端点为空）
├── vite.config.js           # [可能修改] 如有必要添加构建配置调整
└── src/                     # [不变] 现有源代码，无需修改
    ├── game/
    │   ├── emulator.js
    │   ├── input.js
    │   ├── keybinding-ui.js
    │   ├── main.js
    │   └── style.css
    ├── list/
    │   ├── detail-modal.js
    │   ├── detail-modal.css
    │   ├── main.js
    │   └── style.css
    └── shared/
        ├── play-history.js
        ├── relative-time.js
        └── storage.js
```

**Structure Decision**: 本功能是部署基础设施，不改变源代码结构。所有变更限于项目根目录的配置文件（`vercel.json`、`.env.*`）。现有 `src/` 架构保持不变。

## Complexity Tracking

> 无违规项，本表为空。
