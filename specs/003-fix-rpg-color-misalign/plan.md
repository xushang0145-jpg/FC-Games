# 实现方案: 修复 RPG 游戏颜色错位

**分支**: `003-fix-rpg-color-misalign` | **日期**: 2026-06-06 | **规范**: [spec.md](./spec.md)

**输入**: 功能规范来自 `/specs/003-fix-rpg-color-misalign/spec.md`

## 摘要

修复 NES 模拟器渲染画面中红蓝颜色通道互换的问题。根本原因：jsnes 库的 NTSC 调色板使用 BGR 格式（0xBBGGRR）存储颜色值，而宿主代码 `updateImageDataFromFrame` 按 RGB 格式（0xRRGGBB）提取通道字节，导致 R/B 通道写入 Canvas ImageData 时位置互换。

修复为 `src/game/emulator.js` 中两行代码的交换：将 `(color >> 16) & 0xFF`（提取 BGR 的 B 字节）从 ImageData R 位置移到 B 位置，将 `color & 0xFF`（提取 BGR 的 R 字节）从 ImageData B 位置移到 R 位置。

## 技术上下文

**语言/版本**: JavaScript (ES2020+) / Vite 构建

**主要依赖**: jsnes@1.2.1（不可替换）、Canvas 2D API

**存储**: localStorage（按键绑定，不涉及本次修复）

**测试**: vitest（单元测试）、@playwright/test（E2E 测试）

**目标平台**: 现代浏览器（Chrome、Firefox、Safari、Edge 最近 2 个主版本），桌面端优先

**项目类型**: 纯前端 Web 应用（Vite + 原生 Canvas）

**性能目标**: 稳定 60 fps 渲染（修复不变更帧循环逻辑，无性能影响）

**约束**: 主线程保持轻量，不引入额外数组拷贝或颜色空间转换

**规模/范围**: 80+ 款 .nes ROM，单文件单函数修改

## 宪章合规检查

*门禁: 必须在 Phase 0 研究前通过。Phase 1 设计后重新评估。*

| 原则 | 状态 | 说明 |
|------|------|------|
| I. 规范驱动开发 (SDD) | ✅ 通过 | spec.md 已编写并澄清，方案按规范执行 |
| II. 方案即契约 | ✅ 通过 | 本方案为修复的唯一依据，修改范围仅限 `updateImageDataFromFrame` |
| III. 渐进交付与独立可测 | ✅ 通过 | 单一 P1 故事，可独立测试验证 |
| IV. 性能即功能 | ✅ 通过 | 修改为同级操作替换（位运算+赋值），不增加循环开销，不影响 fps |
| V. 简洁优先 (YAGNI) | ✅ 通过 | 直接修复通道映射，不引入抽象层或颜色空间转换库 |

## 项目结构

### 文档（本次功能）

```text
specs/003-fix-rpg-color-misalign/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出：根本原因分析
├── data-model.md        # Phase 1 输出：帧缓冲格式定义
├── quickstart.md        # Phase 1 输出：验证指南
├── contracts/           # Phase 1 输出（无外部接口，跳过）
└── tasks.md             # Phase 2 输出（/speckit-tasks 生成）
```

### 源代码（仓库根目录）

```text
src/game/
├── emulator.js          # ← 唯一修改文件: updateImageDataFromFrame()
├── main.js              # 不修改
├── input.js             # 不修改
├── keybinding-ui.js     # 不修改
└── style.css            # 不修改

tests/
├── e2e/
│   ├── game.spec.js     # 现有 E2E：回归验证
│   └── detail-modal.spec.js
└── unit/                # （本修复不新增单元测试，已有 E2E 覆盖渲染路径）
```

**结构决策**: 单文件修改，不新增文件。项目采用单前端应用结构（Option 1），源码集中于 `src/`。

## 复杂度追踪

> 无宪章违规，无需记录复杂度偏离。

## Phase 0: 研究结论

详见 [research.md](./research.md)。

**根本原因**: jsnes `PaletteTable.loadNTSCPalette()` 中的 64 色调色板数值为 BGR 格式（0xBBGGRR），而非项目代码注释假设的 RGB 格式（0xRRGGBB）。标准 NES 调色板交叉验证确认了此结论。

**修复策略**: 在 `src/game/emulator.js` 的 `updateImageDataFromFrame()` 函数中，将 R 和 B 通道的提取表达式互换，使：
- ImageData 字节 0（R）从 `color & 0xFF`（BGR 的低字节 = R）获取
- ImageData 字节 2（B）从 `(color >> 16) & 0xFF`（BGR 的高字节 = B）获取

## Phase 1: 设计

### data-model.md

详见 [data-model.md](./data-model.md)。

帧缓冲格式明确定义为 BGR（0xBBGGRR），ImageData 格式为 RGBA。映射关系: BGR[bits 7:0]→R, BGR[bits 15:8]→G, BGR[bits 23:16]→B。

### contracts/

无外部接口变更。`onFrame` 回调签名不变，Canvas ImageData 格式不变。

### quickstart.md

详见 [quickstart.md](./quickstart.md)。

验证步骤：启动开发服务器 → 加载 RPG ROM → 目视确认红蓝通道正确 → 对比超级玛莉回归 → 运行 E2E 测试。
