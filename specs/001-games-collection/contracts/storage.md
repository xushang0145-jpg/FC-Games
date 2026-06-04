# 存储契约：localStorage 按键配置

## Key

```
nes_keybindings
```

## Value Schema

```json
{
  "<romFileName>.nes": {
    "up": "<KeyboardEvent.code>",
    "down": "<KeyboardEvent.code>",
    "left": "<KeyboardEvent.code>",
    "right": "<KeyboardEvent.code>",
    "a": "<KeyboardEvent.code>",
    "b": "<KeyboardEvent.code>",
    "start": "<KeyboardEvent.code>",
    "select": "<KeyboardEvent.code>"
  }
}
```

- 顶层 key 为 ROM 文件名（含 `.nes` 扩展名）
- 仅存储已自定义的游戏，未配置的游戏不出现在 JSON 中
- 键位值使用 `KeyboardEvent.code` 格式（物理键位标识，如 `"KeyW"`, `"ArrowUp"`, `"Space"`）
- 每个游戏条目必须包含全部 8 个操作的完整映射

## 读写接口

```js
// 读取某游戏的配置，返回完整映射或 null（表示使用默认）
function loadKeyBindings(gameId) → Object | null

// 保存某游戏的配置
function saveKeyBindings(gameId, bindings) → void

// 删除某游戏的配置（恢复默认）
function resetKeyBindings(gameId) → void
```

## 冲突检测

保存前必须检查 8 个键位值无重复。通过 `new Set(Object.values(bindings)).size === 8` 验证。不满足时拒绝保存并返回冲突详情。
