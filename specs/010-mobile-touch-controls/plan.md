# Implementation Plan: 移动端触摸控制

**Branch**: `010-mobile-touch-controls` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-mobile-touch-controls/spec.md`

## Summary

为 FC 游戏合集网站添加移动端虚拟手柄支持。通过浏览器原生 Touch Events API 实现覆盖在游戏画面上的虚拟方向键和操作按钮，将触摸输入映射为 jsnes 控制器按键。桌面端不显示虚拟手柄，保持原有键盘控制体验。

交付按 P1 → P2 → P3 分阶段：P1 完成基础方向键+A/B 按钮，P2 完成 Start/Select 功能键，P3 完成触摸体验优化（多指操作、触摸容差、横竖屏自适应）。

## Technical Context

**Language/Version**: JavaScript (ES2020+)，浏览器环境

**Primary Dependencies**:
- `jsnes@1.2.1` — NES 模拟器（现有依赖）
- `vite` — 构建工具（现有依赖）
- `vitest` — 单元测试（现有依赖）
- `@playwright/test` — E2E 测试（现有依赖）

**Storage**: N/A（无数据持久化需求）

**Testing**: vitest（单元测试）、@playwright/test（E2E 测试）

**Target Platform**: 现代浏览器（Chrome 90+、Firefox 90+、Safari 15+），移动端优先

**Project Type**: web-application（纯前端功能）

**Performance Goals**:
- NES 模拟器稳定 60 fps，触摸事件处理不占用主线程渲染时间
- 触摸响应延迟 < 50ms（从手指触碰到游戏角色响应）

**Constraints**:
- 不引入新的外部依赖（遵循 YAGNI，Touch Events API 为浏览器原生）
- 触摸事件处理必须阻止默认浏览器行为（文本选择、上下文菜单、页面缩放）
- 桌面端不显示虚拟手柄，原有键盘控制不受影响
- 支持横竖屏切换自适应

**Scale/Scope**:
- 单用户场景，虚拟手柄仅作用于单个游戏页面
- 屏幕宽度最小支持 320px

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 状态 | 说明 |
| --- | --- | --- |
| I. 规范驱动开发 (SDD) | ✅ 通过 | 已执行 specify，当前正在 plan 阶段 |
| II. 方案即契约 | ✅ 通过 | plan.md 将作为实现的唯一依据 |
| III. 渐进交付与独立可测 | ✅ 通过 | P1（方向键+A/B）→ P2（Start/Select）→ P3（体验优化），每阶段可独立验证 |
| IV. 性能即功能 | ⚠️ 需关注 | 触摸事件监听不能阻塞 requestAnimationFrame 循环；避免 touchmove 高频触发中的重计算 |
| V. 简洁优先 (YAGNI) | ✅ 通过 | 不引入新依赖，使用浏览器原生 Touch Events API |

**性能保障措施**:
- 触摸事件通过 `touchstart`/`touchend` 处理（非 `touchmove`），减少事件频率
- 按钮状态变化通过 CSS 类切换实现（GPU 加速），不触发重排
- 虚拟手柄 DOM 使用 `touch-action: none` 阻止浏览器默认触摸行为
- 触摸事件处理函数保持轻量，直接调用 emulator 的 buttonDown/buttonUp

## Project Structure

### Documentation (this feature)

```text
specs/010-mobile-touch-controls/
├── plan.md              # 本文件
├── spec.md              # 功能规范
├── research.md          # Phase 0 研究成果
├── data-model.md        # Phase 1 数据模型（N/A，本功能无持久化数据）
├── quickstart.md        # Phase 1 验证指南
├── contracts/           # Phase 1 API 契约
└── tasks.md             # Phase 2 任务列表（由 /speckit-tasks 生成）
```

### Source Code (repository root)

```text
src/
├── list/                # 首页代码（现有，不修改）
│   ├── main.js
│   ├── style.css
│   └── detail-modal.js
├── game/                # 游戏页代码（现有 + 新增）
│   ├── main.js          # 修改：添加虚拟手柄初始化调用
│   ├── emulator.js      # 现有，不修改
│   ├── input.js         # 现有，不修改（虚拟手柄复用其 getControllerButton）
│   ├── virtual-gamepad.js   # 【新增】虚拟手柄核心模块
│   ├── virtual-gamepad.css  # 【新增】虚拟手柄样式
│   └── style.css        # 修改：添加少量虚拟手柄相关基础样式
├── shared/              # 共享模块
│   ├── storage.js       # 现有，不修改
│   ├── play-history.js  # 现有，不修改
│   ├── analytics.js     # 现有（来自 006），不修改
│   ├── analytics-queue.js  # 现有（来自 006），不修改
│   ├── device.js        # 现有（来自 006，detectDeviceType），010 新增 isMobileDevice()
│   ├── geo.js           # 现有（来自 006），不修改
│   └── user-id.js       # 现有（来自 006），不修改
└── stats.html           # 现有（006 已完成），不修改

game.html                # 修改：添加虚拟手柄 DOM 容器
tests/
├── e2e/
│   └── game.spec.js     # 修改：添加虚拟手柄 E2E 测试
└── unit/
    └── virtual-gamepad.test.js  # 【新增】虚拟手柄单元测试
```

**Structure Decision**: 采用单项目结构，在现有 `src/game/` 目录下新增 `virtual-gamepad.js` 和 `virtual-gamepad.css`。虚拟手柄作为独立模块，通过初始化函数注入到 `game.html`。与现有键盘输入模块 (`input.js`) 完全解耦——两者都调用 emulator 的 buttonDown/buttonUp，但互不依赖。

**模块边界（与 006 埋点系统的关系）**:
- 虚拟手柄模块不感知埋点系统，不调用 analytics API
- Start 按钮的触摸操作通过 `emulator.buttonDown(1, BUTTON_START)` 触发游戏逻辑，与键盘 Start 键走相同的模拟器接口，效果一致
- 触摸 Start 不会触发 `trackGameStart` 埋点事件（该事件绑定在 startBtn click 监听器上，属 006 埋点功能的设计范围）
- 两个功能对 `main.js` 的改动位于不同位置（虚拟手柄初始化 vs 埋点初始化），无冲突

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 无 | — | — |
