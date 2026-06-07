# 实现方案：Web 端默认按键 Start/Select 互换

**Branch**: `013-swap-start-select-keys` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: 功能规范 `specs/013-swap-start-select-keys/spec.md`

## 摘要

将 `DEFAULT_BINDINGS` 中 `start` 和 `select` 对应的默认键盘按键互换：`start` 从 `Digit2` 改为 `Digit1`，`select` 从 `Digit1` 改为 `Digit2`。这是纯数据层面的变更，不影响按键系统架构。

## 技术上下文

**涉及文件**: `src/game/input.js`、`src/list/detail-modal.js`

**改动类型**: 常量值对调

**向下兼容**: `loadBinding()` 为已有自定义配置的用户读取 localStorage 中的配置，覆盖默认值，故不受影响。

## 宪章合规检查

| 原则 | 状态 | 说明 |
| --- | --- | --- |
| I. SDD | ✅ | 基于 spec.md |
| II. 方案即契约 | ✅ | 仅改常量 |
| III. 独立可测 | ✅ | 清除 localStorage 后验证默认按键 |
| IV. 性能 | ✅ | 无性能影响 |
| V. YAGNI | ✅ | 纯数据变更 |

## 修改范围

### 1. `src/game/input.js` 第 17-18 行 — DEFAULT_BINDINGS

```
- start: 'Digit2',
- select: 'Digit1',
+ start: 'Digit1',
+ select: 'Digit2',
```

### 2. `src/list/detail-modal.js` 第 19-22 行 — 默认按键展示

详情浮层用于展示按键说明，内部也有硬编码的 DEFAULT_BINDINGS fallback：
```
- a: 'KeyZ', b: 'KeyX', start: 'Enter', select: 'ShiftRight',
+ a: 'KeyZ', b: 'KeyX', start: 'Enter', select: 'ShiftRight',
```
检查确认 detail-modal.js 中的默认值是否需调整。当前浮层用 `loadKeyBindings(game.id)` 获取实际配置，fallback 用硬编码。需要确认 `start: 'Enter'` 和 `select: 'ShiftRight'` 是否也需要互换。

### 3. E2E 测试更新

`tests/e2e/game.spec.js` 中如有引用 Digit1/2 的测试需同步更新。

## 数据流

```
新用户/清除缓存
  → loadBinding(romFile) → loadKeyBindings 返回 null
    → 回退到 DEFAULT_BINDINGS → { start: 'Digit1', select: 'Digit2' }
      → buildCodeMap() → { Digit1: 'start', Digit2: 'select' }
        → onKeyDown(Digit1) → emulator.buttonDown(1, BUTTON_START) ✅

已有配置用户
  → loadBinding(romFile) → 返回 localStorage 中的自定义配置
    → { ...DEFAULT_BINDINGS, ...savedBindings } → 旧配置覆盖默认 ✅
```

## 验证

1. 清除浏览器 localStorage → 打开游戏页 → 按数字 1 → 触发 Start → 按数字 2 → 触发 Select
2. 有自定义按键配置的用户 → 配置保持不变
3. 列表页详情浮层 → 按键说明显示正确
4. `npx playwright test` → E2E 测试通过
