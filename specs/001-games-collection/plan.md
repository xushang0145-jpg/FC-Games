# 实现方案：FC 游戏合集

**Branch**: `001-games-collection` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

**Input**: 功能规范 `specs/001-games-collection/spec.md`

## 摘要

构建一个纯前端网页 FC 游戏合集，玩家在游戏列表页面浏览 88 款 FC 游戏（平铺网格 + 搜索过滤），点击游戏卡片后在新标签页打开游戏页面。游戏页面使用 jsnes 模拟器核心渲染游戏画面、输出音频、处理按键输入，支持按游戏独立自定义按键映射并通过 localStorage 持久化。

## 技术上下文

**语言/版本**: JavaScript (ES2022+)，可选 TypeScript 严格模式

**核心依赖**: jsnes@1.2.1（模拟核心）、vite（构建/开发服务器）

**存储**: 浏览器 localStorage（按键配置持久化）

**测试**: vitest（单元测试）、@playwright/test（E2E 测试）

**目标平台**: 现代浏览器桌面端（Chrome、Firefox、Safari、Edge 最近 2 个主版本）

**项目类型**: 纯前端 Web 应用（静态站点，无后端服务）

**性能目标**: 60 fps 稳定渲染、ROM 加载后 <3 秒首次可玩、88 款游戏列表 <2 秒渲染

**约束**: 主线程关键路径（frame 回调、音频回调、输入处理）必须保持轻量；ROM 通过 fetch 作为静态资源加载

**规模/范围**: 88 款 ROM 文件、单一用户（无账号系统）、桌面端优先

## 宪章合规检查

*门禁：Phase 0 研究前必须通过。Phase 1 设计后重新评估。*

**结构决策**：选择单项目 Web 应用结构。项目仅有两个"页面"（列表页 + 游戏页），无需 SPA 路由框架。Vite 多页配置天然支持 `index.html` 和 `game.html` 两个入口。共享模块仅提取真正共用的存储工具，符合 YAGNI 原则。
| 原则 | 状态 | 说明 |
| --- | --- | --- |
| I. 规范驱动开发 (SDD) | ✅ 通过 | 本方案基于已确认的 spec.md 构建 |
| II. 方案即契约 | ✅ 通过 | plan.md 将作为实现的唯一依据 |
| III. 渐进交付与独立可测 | ✅ 通过 | P1→P2→P3 三个独立可测的用户故事，P1 完成后即可演示 MVP |
| IV. 性能即功能 | ✅ 通过 | 性能约束已明确，设计中将关键路径与 UI 分离 |
| V. 简洁优先 (YAGNI) | ✅ 通过 | 不做路由框架、状态管理库等过度抽象；两个 HTML 入口 + 少量共享模块 |

## 项目结构

### 文档（本功能）

```text
specs/001-games-collection/
├── spec.md              # 功能规范（由 /speckit-specify 生成）
├── plan.md              # 本文件（实现方案）
├── architecture.md      # 项目架构图（Mermaid 图）
├── research.md          # Phase 0 产出：技术研究
├── data-model.md        # Phase 1 产出：数据模型
├── quickstart.md        # Phase 1 产出：快速验证指南
├── contracts/           # Phase 1 产出：接口契约
└── tasks.md             # Phase 2 产出（由 /speckit-tasks 生成）
```

### 源代码（仓库根目录）

```text
index.html                  # 游戏列表页入口
src/
├── list/                   # 游戏列表页模块
│   ├── main.js             # 入口：渲染列表、搜索、事件绑定
│   └── style.css           # 列表页样式（平铺网格、卡片、搜索框）
├── game/                   # 游戏运行页模块
│   ├── main.js             # 入口：URL 参数解析、启动确认、模拟器生命周期
│   ├── emulator.js         # jsnes 封装：初始化、帧循环、音频、输入
│   ├── input.js            # 按键映射：默认配置、自定义绑定、冲突检测
│   ├── keybinding-ui.js    # 按键设置面板 UI
│   └── style.css           # 游戏页样式（Canvas、启动确认界面、设置面板）
└── shared/                 # 共享工具
    └── storage.js          # localStorage 读写封装（按键配置 CRUD）

game.html                   # 游戏运行页入口（Vite 多页配置）
roms/                       # ROM 文件目录（已存在，88 个 .nes 文件）
tests/
├── unit/                   # 单元测试（vitest）
│   ├── input.test.js       # 按键映射逻辑测试
│   └── storage.test.js     # 存储读写测试
└── e2e/                    # E2E 测试（@playwright/test）
    ├── list.spec.js        # 列表页：渲染、搜索、点击卡片
    └── game.spec.js        # 游戏页：加载、启动、按键响应
```


## 复杂度追踪

> 无宪章违规项，无需记录。
