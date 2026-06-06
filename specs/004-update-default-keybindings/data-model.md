# Data Model: 更新默认按键映射

**Feature**: 004-update-default-keybindings
**Date**: 2026-06-06

## 实体定义

### KeyBinding（按键绑定）

游戏动作到物理键盘码的映射，按游戏 ID 独立存储。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `up` | `string` | `KeyW` | 方向：上 |
| `down` | `string` | `KeyS` | 方向：下 |
| `left` | `string` | `KeyA` | 方向：左 |
| `right` | `string` | `KeyD` | 方向：右 |
| `a` | `string` | `KeyK` | A 按钮（普通） |
| `b` | `string` | `KeyJ` | B 按钮（普通） |
| `turboA` | `string` | `KeyI` | A 按钮连发（新增字段） |
| `turboB` | `string` | `KeyU` | B 按钮连发（新增字段） |
| `start` | `string` | `Digit2` | Start 按钮 |
| `select` | `string` | `Digit1` | Select（投币）按钮 |

**约束**:
- 所有 10 个字段值必须互不相同（无冲突）
- 字段值为 `KeyboardEvent.code` 格式（如 `KeyW`、`Digit1`）
- 每游戏独立存储一条 KeyBinding 记录

### TurboState（连发状态）

运行时状态，追踪连发按键的按住/释放和当前按钮电平。不持久化。

| 字段 | 类型 | 说明 |
|------|------|------|
| `turboA.active` | `boolean` | I 键是否按住 |
| `turboA.intervalId` | `number\|null` | setInterval 句柄 |
| `turboA.pressed` | `boolean` | A 按钮当前是否处于按下状态（翻转用） |
| `turboB.active` | `boolean` | U 键是否按住 |
| `turboB.intervalId` | `number\|null` | setInterval 句柄 |
| `turboB.pressed` | `boolean` | B 按钮当前是否处于按下状态（翻转用） |

**生命周期**: 随页面加载创建，页面关闭销毁。不进入 localStorage。

## 存储格式

**localStorage key**: `nes_keybindings`

```json
{
  "超级玛莉.nes": {
    "up": "KeyW",
    "down": "KeyS",
    "left": "KeyA",
    "right": "KeyD",
    "a": "KeyK",
    "b": "KeyJ",
    "turboA": "KeyI",
    "turboB": "KeyU",
    "start": "Digit2",
    "select": "Digit1"
  },
  "魂斗罗.nes": { "...": "..." }
}
```

## 版本兼容

- **旧格式（8 字段）**: 读取时通过 `{ ...DEFAULT_BINDINGS, ...saved }` 自动补充 turboA/turboB
- **新格式（10 字段）**: 直接使用
- **无已保存配置**: 返回 `DEFAULT_BINDINGS` 完整副本
