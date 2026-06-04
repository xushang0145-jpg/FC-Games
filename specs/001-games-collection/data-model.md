# 数据模型：FC 游戏合集

**Date**: 2026-06-04 | **关联方案**: [plan.md](./plan.md)

## 实体定义

### Game（游戏）

代表 `roms/` 目录中的一款 FC 游戏。数据来源于构建时扫描 ROM 目录或运行时 fetch 探测，无需持久化存储。

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 唯一标识，即 ROM 文件名（含 `.nes` 扩展名），如 `"超级玛莉.nes"` |
| name | string | 显示名称，从 id 去除 `.nes` 后缀得到，如 `"超级玛莉"` |
| romPath | string | 静态资源路径，如 `"/roms/超级玛莉.nes"` |

**标识规则**: ROM 文件名即为唯一标识，中文原名。

**获取方式**: Vite 构建时通过 `import.meta.glob('/roms/*.nes')` 获取文件列表，或维护一个 ROM 列表配置文件。

---

### KeyBinding（按键配置）

代表玩家为某个游戏自定义的按键映射，持久化于 localStorage。

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| gameId | string | 关联的游戏 ROM 文件名（外键 → Game.id） |
| up | string | 上方向键位（KeyboardEvent.code 值），默认 `"ArrowUp"` |
| down | string | 下方向键位，默认 `"ArrowDown"` |
| left | string | 左方向键位，默认 `"ArrowLeft"` |
| right | string | 右方向键位，默认 `"ArrowRight"` |
| a | string | A 按钮键位，默认 `"KeyZ"` |
| b | string | B 按钮键位，默认 `"KeyX"` |
| start | string | Start 键位，默认 `"Enter"` |
| select | string | Select 键位，默认 `"ShiftRight"` |

**约束**:
- 8 个键位值必须互不相同（同一按键不能映射到多个操作）
- 未持久化配置的游戏使用默认值
- 存储格式见 [storage.md](./contracts/storage.md)

---

### EmulatorSession（模拟器会话）

运行时内存中的对象，代表一个正在运行的游戏模拟器实例。不持久化。

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| game | Game | 关联的游戏实体 |
| nes | jsnes.NES | jsnes 引擎实例 |
| canvas | HTMLCanvasElement | 渲染目标 Canvas 元素 |
| audioCtx | AudioContext | 音频播放上下文 |
| frameId | number | requestAnimationFrame 返回的 ID（用于停止） |
| status | enum | `"idle"` \ | `"running"` \ | `"paused"` \ | `"stopped"` |

**生命周期状态转换**:

```
idle → (loadROM) → idle → (start) → running
running → (pause) → paused → (resume) → running
running → (stop/tab close) → stopped → (dispose)
paused → (stop/tab close) → stopped → (dispose)
```
