# Research: 项目部署

**Feature**: 005-project-deployment
**Created**: 2026-06-06

## 1. 部署平台选型

**Decision**: Vercel

**Rationale**:
- 原生 Vite 集成，零配置部署（自动检测 Vite 项目并设置正确的构建命令和输出目录）
- GitHub 集成：推送即自动部署，支持预览部署（Preview Deployments）用于 PR 审阅
- Serverless Functions（Node.js/Go/Python）：后续存档功能可零迁移启用后端 API
- Edge Middleware：可用于未来 API 路由、认证拦截等，无需独立后端服务
- 免费额度充足：100GB 带宽/月、100GB 存储、2000 Serverless Function 执行/月
- 自动 HTTPS：自定义域名一键绑定，SSL 证书自动续期
- CDN 全球加速：静态资源（含 ROM 文件）自动分发到全球边缘节点

**Alternatives Considered**:
| 方案 | 优点 | 拒绝原因 |
|------|------|----------|
| Netlify | 类似功能集，Functions 同 Vercel | Vite 集成不如 Vercel 原生，"Buy Me a Coffee" 模式无业务需求 |
| Cloudflare Pages | 无限带宽、Workers 原生支持 WebSocket | Durable Objects 锁定平台；Vercel 生态更成熟 |
| GitHub Pages | 免费、零配置 | 无 Serverless、不支持 SPA 路由、仅静态文件 |
| 自建 VPS (Nginx) | 最大灵活性 | 运维成本高、需自行处理 HTTPS/CI/CD/CDN，违反 YAGNI |

## 2. ROM 文件中文文件名 URL 兼容性

**Decision**: Vercel CDN 原生支持 UTF-8 编码 URL，中文文件名无需额外处理。Vite 构建时 `copyRomsPlugin` 将 ROM 从 `roms/` 复制到 `dist/roms/`，文件名保持不变。浏览器 `fetch()` 自动处理 UTF-8 路径编码。

**Rationale**:
- 本地开发已验证：`fetch('/roms/超级玛莉.nes')` 在 vite dev server 正常工作
- Vercel 边缘节点使用 HTTP/2，支持原始 UTF-8 路径
- 无需将文件名转 ASCII（如 punycode 或 hash），保留可读性更利于调试

**Risk**: 部分旧代理/CDN 可能对非 ASCII URL 处理不一致。缓解：Vercel CDN 已处理该问题；若个别环境有问题，可在 `fetch` 时使用 `encodeURIComponent` 编码路径。

## 3. 环境配置注入方案

**Decision**: 使用 Vite 环境变量（`VITE_*` 前缀）进行构建时注入。创建 `.env.production` 文件存放生产环境 API/WebSocket 端点。

**Rationale**:
- Vite 原生支持 `import.meta.env.VITE_*`，零额外依赖
- 构建时静态替换（tree-shakeable），无运行时开销
- 符合 FR-011（按部署环境差异化设置）和 FR-009/FR-010（API/WebSocket 端点预留）
- 当前生产值为空字符串，不含实际后端地址

**实现要点**:
- `.env.development`: `VITE_API_ENDPOINT=` `VITE_WS_ENDPOINT=`
- `.env.production`: `VITE_API_ENDPOINT=` `VITE_WS_ENDPOINT=`
- 未来启用后端时只需修改 `.env.production` 并重新部署

## 4. CI/CD 工作流设计

**Decision**: GitHub Actions 执行 `npm test && npm run build`，通过 Vercel GitHub Integration 自动部署。

**Rationale**:
- Vercel GitHub Integration 原生支持 PR 预览 + 主分支生产部署
- 构建命令：`npm run build`（Vite build，含 ROM 复制）
- 输出目录：`dist/`
- 测试在 CI 中运行 `npx vitest run`（单元测试）+ `npx playwright test`（E2E），全部通过后 Vercel 才部署
- 不需要自定义 GitHub Actions workflow 文件——Vercel Integration 零配置即可完成

**Alternatives Considered**:
| 方案 | 优点 | 拒绝原因 |
|------|------|----------|
| 自定义 GitHub Actions + Vercel CLI | 更大灵活性（如通知、缓存） | 不必要的复杂度，Vercel 原生集成已满足需求 |
| Netlify Git Integration | 零配置 | 已选择 Vercel |

## 5. 静态资源部署策略

**Decision**: 所有文件（HTML、JS、CSS、ROM）作为 Vercel 静态资源部署。构建产物 `dist/` 目录作为输出源。

**Rationale**:
- 当前 dist 结构：`index.html`、`game.html`、`assets/`（JS/CSS，15MB）、`roms/`（88 个 .nes 文件）
- Vercel 自动处理 SPA 路由：`vercel.json` 配置 `rewrites` 将未知路径映射回 `index.html`
- ROM 文件请求走 CDN 边缘缓存，最小化延迟

**SPA 路由处理**: 当前有两个入口 `index.html`（游戏列表）和 `game.html`（模拟器），需配置 clean URLs：

```json
{
  "rewrites": [
    { "source": "/game", "destination": "/game.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
