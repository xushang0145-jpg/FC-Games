# Data Model: 项目部署

**Feature**: 005-project-deployment
**Created**: 2026-06-06

## 概述

本功能是部署基础设施，不引入新的持久化数据实体。所有配置项为构建时静态值，部署产物为纯静态文件。

## 配置实体

### 环境配置 (Build-time Config)

通过 Vite 环境变量在构建时注入，运行时不可变。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `VITE_API_ENDPOINT` | string (URL) | `""` | 未来存档后端 API 基础 URL，空字符串表示未启用 |
| `VITE_WS_ENDPOINT` | string (URL) | `""` | 未来联机 WebSocket 连接地址，空字符串表示未启用 |

**验证规则**:
- 若不为空，MUST 是有效的 `https://` URL（生产）或 `http://localhost:` URL（开发）
- 两个字段独立配置，可仅启用其一

**生命周期**: 构建时从 `.env.production` / `.env.development` 读取 → 编译到 JS bundle → 运行时通过 `import.meta.env.VITE_*` 访问

### 部署产物 (Build Artifacts)

`dist/` 目录内容，即部署到 Vercel 的静态资源集合。

```text
dist/
├── index.html           # 游戏列表首页
├── game.html            # 模拟器页面
├── assets/              # Vite 构建的 JS/CSS（带 hash）
│   ├── *.js             # ~15MB（含 ROM 截图等资源）
│   └── *.css
└── roms/                # 88 个 .nes ROM 文件
    └── *.nes            # 总计 ~15MB
```

**不变性**: 每次部署完整替换，无增量更新。所有文件名（除 assets/ 下的 hash 文件）保持不变。

### 服务端点 (Future — 不在本功能范围)

规划中但不在本功能实现的数据实体，仅供架构参考：

| 实体 | 用途 | 预留方式 |
|------|------|----------|
| 存档服务 API | 用户存档的 CRUD | `VITE_API_ENDPOINT` 环境变量 |
| 联机信令服务 | WebSocket 房间管理/消息中继 | `VITE_WS_ENDPOINT` 环境变量 |
