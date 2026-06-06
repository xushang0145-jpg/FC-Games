# Implementation Plan: 更新默认按键映射

**Branch**: `004-update-default-keybindings` | **Date**: 2026-06-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-update-default-keybindings/spec.md`

## Summary

修改 FC 模拟器的默认键盘映射，从方向键+Z/X 改为 WASD+J/K 布局，将 Select/Start 从 ShiftRight/Enter 改为 Digit1/Digit2，并新增 A/B 按钮连发功能（默认 I/U 键）。保证已有自定义配置的老用户数据不丢失。

## Technical Context

**Language/Version**: JavaScript (ES Modules)，运行于现代浏览器
**Primary Dependencies**: `jsnes@1.2.1`（NES 模拟核心，不可替换）
**Storage**: `localStorage`，key 为 `nes_keybindings`，按游戏 ID 分隔
**Testing**: `vitest`（单元测试）+ `@playwright/test`（E2E 测试）
**Target Platform**: 现代浏览器（Chrome、Firefox、Safari、Edge 最近 2 个主版本），桌面端优先
**Project Type**: 纯前端 Web 应用
**Performance Goals**: 稳定 60 fps 渲染，连发不增加主线程感知负担
**Constraints**: 连发实现不得阻塞 requestAnimationFrame 帧循环
**Scale/Scope**: 10 个按键映射字段（原 8 个 + 2 个连发键），单个游戏页面

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原则 | 检查项 | 状态 |
|------|--------|------|
| I. 规范驱动开发 | 已有 spec.md，经 `/speckit-specify` 产出 | ✅ 通过 |
| II. 方案即契约 | 本 plan.md 为实现唯一依据 | ✅ 本文件即契约 |
| III. 渐进交付与独立可测 | P1 默认键位 → P2 连发 → P3 向后兼容，每级独立可测 | ✅ 通过 |
| IV. 性能即功能 | 连发用 setInterval（非帧循环路径），不影响 60 fps | ✅ 通过 |
| V. 简洁优先 (YAGNI) | 不引入可调频率、不抽象连发为通用框架 | ✅ 通过 |

**Gate 结果**: 全部通过，无需 Complexity Tracking。

## Project Structure

### Documentation (this feature)

```text
specs/004-update-default-keybindings/
├── plan.md              # 本文件
├── research.md          # Phase 0 输出
├── data-model.md        # Phase 1 输出
├── quickstart.md        # Phase 1 输出
├── contracts/           # Phase 1 输出
│   └── keybinding-format.md
└── tasks.md             # Phase 2 输出 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── game/
│   ├── input.js             # 主要修改：DEFAULT_BINDINGS、loadBinding、createInputHandler
│   ├── emulator.js          # 不变
│   ├── main.js              # 少量修改：更新冲突检测传递
│   └── keybinding-ui.js     # 自动适配（基于 Object.entries 渲染）
└── shared/
    └── storage.js           # 不变

tests/
├── unit/
│   └── input.test.js        # 扩展：覆盖新默认值、连发、10 键冲突检测
└── e2e/
    └── game.spec.js         # 扩展：验证新默认键位可用
```

**Structure Decision**: 改动集中在 `src/game/input.js`，只修改常量定义和输入处理逻辑。`keybinding-ui.js` 和 `storage.js` 无需修改（UI 自动适配任意数量的 bindings 字段，storage 读写对象不校验字段数）。

## Complexity Tracking

> 无违规项，无需填写。
