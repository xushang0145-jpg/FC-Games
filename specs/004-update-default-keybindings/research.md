# Research: 更新默认按键映射

**Feature**: 004-update-default-keybindings
**Date**: 2026-06-06

## 1. 连发 (Turbo) 实现方案

**Decision**: 使用 `setInterval` 在按键映射层实现连发，而非在模拟器帧循环中处理。

**Rationale**:
- `setInterval` 不在 `requestAnimationFrame` 帧循环路径上，不影响 60 fps 渲染性能（满足宪章 IV）
- 连发只需在按键层面交替调用 `buttonDown`/`buttonUp`，与 jsnes 内部帧逻辑解耦
- 频率 12.5 Hz（80ms 间隔）落在 spec 要求的 10-15 Hz 范围内
- 实现简单，约 20 行代码

**Alternatives considered**:
- **帧循环内处理**: 在 `emulator.js` 的 `runFrame` 中维护计数器，每 N 帧翻转一次。被拒绝：增加模块间耦合，需要从 input 层传递状态到 emulator 层。
- **requestAnimationFrame 递归**: 用 rAF 替代 setInterval。被拒绝：rAF 频率过高（~60 Hz），需要额外节流逻辑，且语义上不匹配（连发不关心帧边界）。

## 2. 向后兼容策略

**Decision**: `loadBinding` 将已保存配置与 DEFAULT_BINDINGS 做浅合并（已保存的值优先，缺失的键用默认值补充）。

**Rationale**:
- 旧版本保存的配置只有 8 个键（缺少 turboA/turboB），浅合并自动补充新的连发默认键
- 用户已自定义的 8 个键保持不变，满足 FR-010
- 新用户无已保存配置时，直接使用完整的 10 键默认值
- 实现成本极低：`{ ...DEFAULT_BINDINGS, ...saved }`

**Alternatives considered**:
- **版本号迁移**: 在 localStorage 中存储 schema version，根据版本做显式迁移。被拒绝：当前是第一次 keys 结构变更，过度设计。如果未来再次增加键位，再考虑版本化。
- **严格保留旧数据**: 不加 turboA/turboB 给老用户。被拒绝：老用户无法使用连发功能，体验不一致。

## 3. KeyboardEvent.code 值确认

**Decision**: 使用 `KeyW`/`KeyS`/`KeyA`/`KeyD`/`KeyJ`/`KeyK`/`KeyI`/`KeyU`/`Digit1`/`Digit2` 作为默认值。

**Rationale**:
- `KeyboardEvent.code` 返回物理键位标识，不受键盘布局（QWERTY/AZERTY）影响
- 现有代码已使用 `code` 属性（如 `ArrowUp`、`KeyZ`），保持一致性
- WASD 布局在中文用户中最常见

**验证**: 所有目标浏览器均支持 `KeyboardEvent.code` 属性（Chrome 49+, Firefox 48+, Safari 10+, Edge 79+）。

## 4. 按键设置 UI 兼容性

**Decision**: `keybinding-ui.js` 无需修改。

**Rationale**:
- UI 使用 `Object.entries(currentBindings)` 遍历渲染，自动适配 8→10 键
- `formatCode` 函数已处理 `Digit` 前缀（替换为空字符串），Digit1/Digit2 显示为 "1"/"2"
- 冲突检测使用 `Object.entries(currentBindings)` 遍历所有键位，自动覆盖 10 键

## 5. jsnes Controller 常量映射

**Decision**: 连发键映射到与非连发相同的 `jsnes.Controller` 常量（`BUTTON_A`、`BUTTON_B`）。

**Rationale**:
- jsnes 不认识"连发"概念，连发是宿主层的功能——快速交替调用同一个 button 的 down/up
- `getControllerButton` 函数新增 `turboA` → `BUTTON_A` 和 `turboB` → `BUTTON_B` 映射

**验证**: jsnes 的 `buttonDown`/`buttonUp` 在任何状态下都可以安全调用（`loaded` 或 `running` 状态），emulator 层已有状态检查。
