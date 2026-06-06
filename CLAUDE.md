# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供该代码仓库的工作指引。


本项目遵循 [constitution.md](./.specify/memory/constitution.md)（v1.0.0），它是所有开发实践的最高准则。以下是五大核心原则摘要，完整内容以宪章原文为准：

1. **规范驱动开发 (SDD)** — 先定规范，再写代码。任何功能/改动/修复在编码前 MUST 有书面规范和方案并获用户确认。
2. **方案即契约** — 方案文档是实现的唯一依据。实现偏离方案时 MUST 回退到方案阶段修订，禁止在编码时"临时发挥"。
3. **渐进交付与独立可测** — 功能按 P1→P2→P3 拆分为独立用户故事，每个故事可独立实现、测试、交付。MVP (P1) 完成后先验证再决定是否继续。
4. **性能即功能** — NES 模拟要求稳定 60 fps，任何改动 MUST 不影响模拟性能。性能基准：60 fps 渲染、音频无感知延迟、ROM 加载后首次可玩 < 3 秒。
5. **简洁优先 (YAGNI)** — 不做当前不需要的抽象，不预留未来接口。三个相似行不急于抽取，不引入未使用依赖。

## 开发工作流

每个功能经过以下六个阶段，不得跳过或合并：

| 阶段 | 命令 | 产出 | 说明 |
| --- | --- | --- | --- |
| 1. 规范 | `speckit-specify` | `spec.md` | 用户故事、验收场景、功能需求、边界条件 |
| 2. 澄清 | `speckit-clarify` | 更新 `spec.md` | 解决规范中的歧义和缺失项 |
| 3. 方案 | `speckit-plan` | `plan.md` | 架构设计、组件划分、数据流、技术选型 |
| 4. 任务 | `speckit-tasks` | `tasks.md` | 按用户故事分组的可执行任务 |
| 5. 实现 | `speckit-implement` | 代码 + 提交 | 严格按 tasks.md 编码，逐任务提交 |
| 6. 验证 | `verification-before-completion` | 验证报告 | 对照规范和方案逐项确认 |

**微小改动例外**: 不改变任何行为或接口的纯机械操作（拼写修正、格式调整）可跳过完整流程，但需简要说明改动内容。

**质量门禁**:
- 每个用户故事的验收场景 MUST 全部通过
- P1 故事 MUST 完成才能合并到主分支
- 性能关键路径改动 MUST 手动验证 60 fps 未退化

## 技术约束

## 项目宪章
这是一个处于早期阶段的 FC（红白机）游戏合集网站。`node_modules/` 已存在（依赖已安装），但 `package.json`、`index.html` 以及所有应用源代码尚未纳入仓库。
- **目标平台**: 现代浏览器（Chrome、Firefox、Safari、Edge 最近 2 个主版本），桌面端优先
- **语言**: JavaScript / TypeScript
- **代码规范**: 所有文档、注释、提交信息 MUST 使用中文
- **核心依赖**: `jsnes@1.2.1`（不可替换）、`vite`（构建工具）、`vitest`（单元测试）、`@playwright/test`（E2E 测试）

## 项目状态


所有游戏 ROM（80+ 款）存放在 `roms/` 目录下，格式为 `.nes`。文件名使用中文（例如 `超级玛莉.nes`、`魂斗罗.nes`）。

## 预期开发命令

```bash
npm install                    # 安装依赖
npm run dev                    # 启动开发服务器
npm run build                  # 生产构建
npm run preview                # 预览生产构建
npx vitest                     # 运行单元测试
npx vitest run                 # CI 模式运行单元测试
npx playwright test            # 运行 E2E 测试
npx playwright test <file>     # 运行单个 E2E 测试
```

## `jsnes` 集成架构

`jsnes`（v1.2.1）是底层 NES 模拟器，浏览器集成需连接以下四个模块：

3. **画面渲染** — `onFrame` 回调接收 `frameBuffer`（256×240×3 RGB 数组），绘制到 `<canvas>`。稳定 60 fps，主线程保持轻量。
4. **音频输出** — `onAudioSample(left, right)` 回调，样本入队到 `AudioContext`。宿主代码以约 60 fps 驱动 `nes.frame()`。
5. **输入控制** — 键盘/手柄事件映射到 `nes.buttonDown(controller, button)` / `buttonUp`。常量见 `jsnes.Controller`（`BUTTON_A`、`BUTTON_B`、`BUTTON_START`、`BUTTON_SELECT`、`BUTTON_UP`、`BUTTON_DOWN`、`BUTTON_LEFT`、`BUTTON_RIGHT`）。
6. **ROM 加载** — `nes.loadROM(romData)` 接收二进制字符串或字节数组。ROM 作为静态资源通过 `fetch` 加载为 `ArrayBuffer`。

参考：`node_modules/jsnes/example/nes-embed.js` 和 `node_modules/jsnes/README.md`。

## 缺失文件

要使项目可运行，需创建：`package.json`、`index.html`、`vite.config.js`、应用源代码（HTML/JS/TS/CSS）、测试配置。

<!-- SPECKIT START -->
当前功能方案: [specs/002-game-detail-page/plan.md](./specs/002-game-detail-page/plan.md)

游戏详情页交互 — 列表页点击卡片弹出详情浮层，展示游戏信息和按键说明，
支持"开始游戏"跳转、最近游玩记录、快捷键盘操作。
请阅读 plan.md 中的技术上下文、项目结构、宪章合规检查等章节。
<!-- SPECKIT END -->
