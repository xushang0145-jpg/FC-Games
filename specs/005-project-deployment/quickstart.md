# Quickstart: 项目部署验证指南

**Feature**: 005-project-deployment
**Created**: 2026-06-06

## 前提条件

- Node.js 18+ 已安装
- 项目依赖已安装：`npm install`
- Vercel 账号已创建并授权 GitHub 仓库访问

## P1 验证：手动部署到 Vercel

### 1. 本地构建验证

```bash
# 构建生产包
npm run build

# 预览生产构建（本地模拟）
npm run preview
```

**预期结果**:
- `dist/` 目录包含 `index.html`、`game.html`、`assets/`（JS/CSS）、`roms/`（88 个 .nes 文件）
- `npm run preview` 后访问 `http://localhost:4173` 可正常浏览游戏列表
- 点击游戏卡片进入详情弹窗
- 点击"开始游戏"后跳转到模拟器页面，ROM 正常加载并运行在 60 fps
- 中文文件名 ROM（如 `超级玛莉.nes`）可正常加载

### 2. 一键部署到 Vercel

```bash
# 安装 Vercel CLI（如未安装）
npm i -g vercel

# 部署到 Vercel（首次会交互式登录和项目初始化）
vercel --prod
```

**Vercel 配置**（`vercel` 命令交互式设置）:
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### 3. 部署后验证

- 打开 Vercel 分配的预览 URL（`*.vercel.app`）
- 验证游戏列表页正常加载，搜索功能可用
- 验证任选 3 个游戏可正常载入并游玩（含中文文件名 ROM）
- 验证 60 fps 渲染（肉眼无卡顿）
- 打开浏览器开发者工具 Network 面板，确认所有 ROM 文件通过 HTTPS 加载（含中文文件名 URL 编码正确）

## P2 验证：自动化 CI/CD

### 1. 连接 GitHub 仓库

在 Vercel Dashboard 中导入 GitHub 仓库 `games`，Vercel 自动检测 Vite 项目并配置。

### 2. 验证自动部署

```bash
# 推送一个可见变更到主分支
git commit --allow-empty -m "test: 验证自动部署"
git push origin main
```

**预期结果**:
- 推送后 Vercel Dashboard 显示新的 Production Deployment 正在构建
- 构建完成后（<5 分钟）线上网站更新为新版本
- 在 GitHub 仓库的 "Environments" 中可见部署状态

### 3. 验证构建失败保护

- 故意推送一个会导致 `vite build` 失败的提交（如引入语法错误）
- 预期：Vercel 构建失败，线上版本保持不变
- GitHub 收到构建失败通知

## P3 验证：可拓展架构

### 1. 环境变量注入验证

在 Vercel 项目设置中添加环境变量：
- `VITE_API_ENDPOINT` = `https://api.example.com`
- `VITE_WS_ENDPOINT` = `wss://ws.example.com`

重新部署后，在浏览器控制台检查构建产物的 JS 代码中是否包含这些值。

### 2. 分路径部署验证

确认静态资源和未来 API 可共存：
- 所有 `/roms/*`、`/assets/*` 路径返回静态文件
- 所有未匹配的路径（如 `/api/*`）目前回退到 `index.html`（SPA 行为）
- 未来若启用 Vercel Serverless Functions，`/api/*` 路径将优先匹配 Function 路由，不再回退到 SPA

---

## 实际部署信息

**部署日期**: 2026-06-06

**生产 URL**: https://games-hazel-three.vercel.app

**Vercel 项目**:
- 项目 ID: `prj_j8OLeZs4wrzqRQLqLC5cAWcfUiRx`
- 项目名称: `games`
- 团队: `blanks-projects-60fb3206`

**部署验证结果**:

| 验证项 | 结果 |
|--------|------|
| 首页 HTTP 200 | ✅ 通过 |
| 游戏页面 HTTP 200 | ✅ 通过 |
| ROM 文件 HTTPS 加载 | ✅ 通过 |
| 中文文件名 URL 编码 | ✅ 通过 |
| 环境变量注入 | ✅ 通过 |
| SPA 路由回退 | ✅ 通过 |
| GitHub 自动部署 | ⚠️ 待完成（私有仓库需在 Dashboard 手动连接）|

**已知限制**:
- GitHub 仓库为私有，Vercel Git 集成需在 Dashboard 中手动授权连接
- 当前为纯静态模式，无后端服务
- 环境变量 `VITE_API_ENDPOINT` / `VITE_WS_ENDPOINT` 当前为空，未来填入后端地址后重新部署即可启用
