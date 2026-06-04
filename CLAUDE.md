# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供该代码仓库的工作指引。

## 开发方法论：规范驱动开发 (Specification-Driven Development, SDD)

本项目遵循 SDD —— 先定规范，再写代码。所有开发工作按以下流程执行：

1. **规范 (Spec)** — 明确要做什么：功能需求、边界条件、验收标准。输出为规范文档（可内嵌于方案文档中）。
2. **方案 (Plan)** — 明确怎么做：架构设计、组件/模块划分、数据流、技术选型。使用 `brainstorming` + `writing-plans` 技能产出结构化方案文档。
3. **实现 (Implement)** — 严格按照方案文档执行编码。不偏离方案，不在实现阶段做设计决策。
4. **验证 (Verify)** — 对照规范和方案逐项确认：功能是否符合预期、边界条件是否覆盖。使用 `verification-before-completion` 技能。

**关键原则：**
- 任何新功能、改动、修复在写第一行代码之前，必须先有书面规范和方案，并得到用户确认。
- 方案文档是实现的唯一依据。若实现中发现方案问题，回到方案阶段修订，不在代码中"临时发挥"。
- 小改动（拼写修正、格式调整等纯机械操作）可跳过 SDD 流程，但仍需简要说明改动内容。

## 项目状态

这是一个处于早期阶段的 FC（红白机）游戏合集网站。项目目前拥有游戏 ROM 资源，但缺少核心源文件。`node_modules/` 目录已存在（依赖已安装），但 `package.json`、`index.html` 以及所有应用源代码尚未纳入仓库。

**从 `node_modules/.package-lock.json` 推断的技术栈：**
- **NES 模拟核心：** `jsnes@1.2.1`
- **构建工具：** `vite@5.4.21`
- **测试（计划使用，安装不完整）：** `@vitest`、`@playwright/test`


所有游戏 ROM 存放在 `roms/` 目录下，格式为 `.nes`。共有 80 余款游戏，包括 超级玛丽、魂斗罗、忍者神龟、坦克大战、冒险岛 等。ROM 文件名使用中文（例如 `超级玛莉.nes`、`魂斗罗.nes`）。

实现前端时，ROM 文件应作为静态资源提供，通过 `fetch` 加载为二进制数据（ArrayBuffer）后传入 `jsnes`。

## 预期开发命令

在 `package.json` 和源文件恢复/创建后，典型的 Vite 工作流如下：

```bash
# 安装依赖（node_modules/ 已存在）
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

若配置了 Vitest 和 Playwright：

```bash
# 运行单元测试
npx vitest

# 以 CI 模式运行单元测试
npx vitest run

# 运行端到端测试
npx playwright test

# 运行单个端到端测试文件
npx playwright test tests/example.spec.ts
```

## `jsnes` 集成架构要点

`jsnes`（v1.2.1）是一个底层 NES 模拟器。典型的浏览器集成需要连接以下三个模块：

1. **画面渲染：** 在 `new jsnes.NES({ onFrame: ... })` 中传入 `onFrame` 回调。该回调接收一个 `frameBuffer`（长度为 256 × 240 × 3 的 RGB 数组），每帧绘制到 `<canvas>` 上。

2. **音频输出：** 传入 `onAudioSample(left, right)` 回调。音频样本需入队到 `AudioContext` 播放。`jsnes` 不处理时序或音频调度——宿主代码负责以约 60 fps 驱动 `nes.frame()`。

3. **输入控制：** 将键盘/手柄事件映射到 `nes.buttonDown(controller, button)` 和 `nes.buttonUp(controller, button)`。常量位于 `jsnes.Controller` 上（例如 `jsnes.Controller.BUTTON_A`、`BUTTON_B`、`BUTTON_START`、`BUTTON_SELECT`、`BUTTON_UP` 等）。

4. **ROM 加载：** 通过 `nes.loadROM(romData)` 以二进制字符串或字节数组加载 ROM。使用 Vite 时，可将 ROM 放在 `public/roms/`（或保留现有 `roms/` 并在 `vite.config.js` 中配置静态服务），运行时通过 `fetch` 获取。

参考：`node_modules/jsnes/example/nes-embed.js` 包含一个基础（非 React）嵌入示例。`node_modules/jsnes/README.md` 记录了完整 API。

## 缺失文件

要使项目可运行，需创建或恢复以下文件：
- `package.json`
- `index.html`（Vite 入口）
- `vite.config.js` / `vite.config.ts`
- 应用源代码（HTML、JS/TS、CSS）
- 测试配置（若使用 Vitest/Playwright）

## ROM 资源

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
