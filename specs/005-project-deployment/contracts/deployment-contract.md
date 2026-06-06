# Deployment Configuration Contract

**Feature**: 005-project-deployment
**Created**: 2026-06-06

## 1. Vercel 部署配置

### vercel.json

部署平台的配置文件，定义路由规则和构建设置。

```json
{
  "rewrites": [
    { "source": "/game", "destination": "/game.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/roms/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

**路由规则**:
- `/game` → `game.html`（模拟器页面 clean URL）
- 其他所有路径 → `index.html`（SPA 回退，匹配游戏列表页）

**缓存策略**:
- ROM 文件（`/roms/*.nes`）：永久缓存（文件内容不变）
- HTML 文件：默认短期缓存（Vercel 默认策略）
- JS/CSS assets：通过文件名 hash 实现缓存更新

### 环境变量契约

| 变量名 | 当前值 | 说明 | 未来变更方式 |
|--------|--------|------|-------------|
| `VITE_API_ENDPOINT` | `""` | API 端点，空值表示静态模式 | 填入后端服务 URL 后重新部署 |
| `VITE_WS_ENDPOINT` | `""` | WebSocket 端点，空值表示静态模式 | 填入信令服务 URL 后重新部署 |

**约束**:
- 变量名前缀 `VITE_` 是 Vite 必要约定（非此前缀的变量不会暴露给客户端代码）
- 生产环境值由 Vercel 环境变量面板管理，开发环境值在 `.env.development` 文件中

## 2. 前端配置访问接口

当前项目通过 `import.meta.env.VITE_API_ENDPOINT` / `import.meta.env.VITE_WS_ENDPOINT` 访问配置。未来推荐封装为统一的 config 模块，避免散落各处。

### 推荐（但不属于本功能实现范围）

```js
// src/shared/config.js（未来）
export const config = {
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || null,
  wsEndpoint: import.meta.env.VITE_WS_ENDPOINT || null,
  get hasBackend() { return !!this.apiEndpoint; },
  get hasRealtime() { return !!this.wsEndpoint; },
};
```

当前阶段（纯静态）此模块不需要创建——遵循 YAGNI 原则。

## 3. 部署流程契约

```
GitHub Push (main) → Vercel GitHub Integration 检测变更
  → npm run build (vite build)
  → 产物: dist/
  → CDN 分发到全球边缘节点
  → 自定义域名自动绑定 HTTPS
```

**失败处理**: 构建失败时 Vercel 保持上一个成功部署的版本在线，开发者通过 GitHub Commit Status 和邮件收到失败通知。
