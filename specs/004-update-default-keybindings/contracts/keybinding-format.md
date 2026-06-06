# KeyBinding 存储格式契约

**Feature**: 004-update-default-keybindings
**Version**: 2.0
**Date**: 2026-06-06

## localStorage 接口

### Key

`nes_keybindings`

### Value Schema

```json
{
  "<gameId>": {
    "up": "<KeyboardEvent.code>",
    "down": "<KeyboardEvent.code>",
    "left": "<KeyboardEvent.code>",
    "right": "<KeyboardEvent.code>",
    "a": "<KeyboardEvent.code>",
    "b": "<KeyboardEvent.code>",
    "turboA": "<KeyboardEvent.code>",
    "turboB": "<KeyboardEvent.code>",
    "start": "<KeyboardEvent.code>",
    "select": "<KeyboardEvent.code>"
  }
}
```

### 验证规则

1. 每个 gameId 对应的对象 MUST 包含全部 10 个字段
2. 10 个字段的值 MUST 互不相同
3. 字段值为标准 `KeyboardEvent.code` 字符串

### 读取规则

- 无已保存配置 → 返回完整默认值（10 键）
- 已保存配置缺少字段 → 用默认值补充缺失字段（向后兼容旧 8 键格式）

## JavaScript API 契约

### `DEFAULT_BINDINGS`

```js
export const DEFAULT_BINDINGS = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  a: 'KeyK',
  b: 'KeyJ',
  turboA: 'KeyI',
  turboB: 'KeyU',
  start: 'Digit2',
  select: 'Digit1',
};
```

### `loadBinding(gameId: string): KeyBinding`

- 返回 10 字段 KeyBinding 对象
- 优先返回已保存配置，缺失字段用 DEFAULT_BINDINGS 补充

### `saveBinding(gameId: string, bindings: KeyBinding): { success: boolean, reason?: string }`

- 校验 10 字段值互不相同
- 保存到 localStorage

### `createInputHandler(emulator, bindings: KeyBinding): { onKeyDown, onKeyUp }`

- 支持 turboA/turboB 连发处理
- 连发频率 ~12.5 Hz（80ms 间隔）
- 连发与普通按键互不冲突
