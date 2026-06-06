# Feature Specification: 更新默认按键映射

**Feature Branch**: `004-update-default-keybindings`

**Created**: 2026-06-06

**Status**: Draft

**Input**: User description: "游戏按键 默认值修改 — 投币：数字1，start：数字2，上：w，下：s，左：a，右：d，A键：k，B键：j，A键连发：i，B键连发：u"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 新玩家首次打开游戏即可用手感熟悉的键位 (Priority: P1)

作为一名习惯 PC 游戏 WASD 键位的玩家，我打开任意 FC 游戏后，无需进行任何配置即可使用 W/A/S/D 控制方向、J/K 控制 A/B 按钮、1/2 控制投币/开始，直接开始游玩。

**Why this priority**: 默认键位是所有用户的第一体验。当前默认键位（方向键 + Z/X）不符合中国 PC 玩家的操作习惯，直接影响每个新用户的首次体验。

**Independent Test**: 清除浏览器中所有已保存的配置数据，打开任意游戏页面，按下 W/A/S/D 方向键和 J/K 按钮，游戏角色应正确响应。无需进入任何设置页面。

**Acceptance Scenarios**:

1. **Given** 用户首次访问网站（无已保存的配置），**When** 打开任意游戏并按下 W 键，**Then** 游戏角色向上移动
2. **Given** 用户首次访问网站，**When** 按下 A/S/D 键，**Then** 角色分别向左/下/右移动
3. **Given** 用户首次访问网站，**When** 按下 J 键，**Then** 触发 B 按钮（射击/跳跃等游戏中常用动作）
4. **Given** 用户首次访问网站，**When** 按下 K 键，**Then** 触发 A 按钮
5. **Given** 用户首次访问网站，**When** 按下数字 1 键，**Then** 触发投币（Select 按钮）
6. **Given** 用户首次访问网站，**When** 按下数字 2 键，**Then** 触发 Start 按钮

---

### User Story 2 - 玩家使用连发功能 (Priority: P2)

作为一名玩射击类或动作类游戏的玩家，我希望按住连发按键时能自动快速触发对应按钮，避免反复敲击键盘造成手部疲劳。

**Why this priority**: 连发是 FC 游戏中常见需求（射击游戏中需要高频按 A/B），显著提升游戏舒适度。但核心方向+AB 按键是玩任何游戏的前提，连发是锦上添花。

**Independent Test**: 打开任意游戏，按住 I 键（A 连发），观察角色持续执行 A 按钮动作（如连射子弹）；按住 U 键同理触发 B 连发。

**Acceptance Scenarios**:

1. **Given** 用户正在游戏中，**When** 按住 I 键不放，**Then** A 按钮以约每秒 10-15 次的频率连续触发
2. **Given** 用户正在游戏中，**When** 按住 U 键不放，**Then** B 按钮以相同频率连续触发
3. **Given** 用户按住 I 键进行 A 连发，**When** 同时按下 K 键（普通 A），**Then** 两者互不冲突，A 按钮保持触发状态
4. **Given** 用户正在游戏中，**When** 按下 I 键后松开，**Then** A 按钮立即停止触发

---

### User Story 3 - 老用户升级后保留已有自定义配置 (Priority: P3)

作为之前已经自定义过按键的老用户，我在网站更新默认键位后打开游戏，我的个人按键配置不受影响，仍按我之前设定的键位运行。

**Why this priority**: 保证升级不破坏已有用户数据是基础质量要求，但不影响新用户体验的核心流程。

**Independent Test**: 先在当前版本为某个游戏自定义按键并保存，然后升级到新版本，打开该游戏，确认仍使用之前保存的自定义键位。

**Acceptance Scenarios**:

1. **Given** 用户在旧版本中为"超级玛莉"保存了自定义按键，**When** 升级到新版本后打开"超级玛莉"，**Then** 仍使用用户之前保存的自定义按键
2. **Given** 用户从未自定义过"魂斗罗"的按键，**When** 升级后首次打开"魂斗罗"，**Then** 使用新的默认按键（WASD + JK + 12 + IU 连发）

---

### Edge Cases

- 连发按键（I/U）与普通按键（J/K）同时按住时，连发和普通按键应各自独立触发，互不干扰
- 用户在按键设置页面自定义按键后，新默认值不再影响该游戏
- 快速切换连发键（按下-松开-按下），每次按下都应重新开始连发
- 连发键按住时关闭/切换游戏页面，连发应立即停止
- 默认按键的每个值必须互不相同（无冲突）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 将默认方向键从 ArrowUp/ArrowDown/ArrowLeft/ArrowRight 改为 KeyW/KeyS/KeyA/KeyD
- **FR-002**: 系统 MUST 将默认 A 按钮从 KeyZ 改为 KeyK
- **FR-003**: 系统 MUST 将默认 B 按钮从 KeyX 改为 KeyJ
- **FR-004**: 系统 MUST 将默认 Select（投币）按钮从 ShiftRight 改为 Digit1
- **FR-005**: 系统 MUST 将默认 Start 按钮从 Enter 改为 Digit2
- **FR-006**: 系统 MUST 新增 A 按钮连发功能，默认绑定 KeyI 键
- **FR-007**: 系统 MUST 新增 B 按钮连发功能，默认绑定 KeyU 键
- **FR-008**: 连发功能 MUST 在按键按住期间以约 10-15 Hz 频率交替按下/释放对应按钮
- **FR-009**: 连发按键释放后 MUST 立即停止触发，确保按钮最终处于释放状态
- **FR-010**: 已有的自定义按键配置（浏览器中已保存的）MUST 在更新后继续生效，不被新默认值覆盖
- **FR-011**: 按键冲突检测 MUST 覆盖全部 10 个按键（原 8 个 + 2 个连发键）

### Key Entities

- **按键绑定 (KeyBinding)**: 游戏动作到物理按键的映射，包含 10 个字段：up/down/left/right/a/b/turboA/turboB/start/select。存储维度为每游戏独立配置。
- **连发状态 (TurboState)**: 追踪当前是否有连发键被按住，以及对应按钮的当前触发状态。不持久化。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 新用户首次打开游戏后，无需任何配置步骤即可开始游玩（0 次点击）
- **SC-002**: 连发按键按住时，每秒自动触发按钮 10-15 次，释放后 50ms 内停止
- **SC-003**: 连发功能不增加主线程负担，游戏仍保持 60 fps 流畅运行
- **SC-004**: 已有自定义配置的老用户升级后，100% 保留原有按键设置
- **SC-005**: 默认按键之间不存在冲突（10 个默认键值各不相同）

## Assumptions

- 目标用户群体为中国 PC 玩家，习惯左手键盘（WASD）+ 右手操作（JK 区域）
- "投币"对应 NES 的 Select 按钮，在大多数 FC 游戏中用作投币/选择功能
- 连发频率 10-15 Hz 满足绝大多数射击/动作游戏需求，不需要可调节
- 连发键本身不可自定义与其他动作互换（turboA/turboB 是独立动作类型），但可重新绑定到其他物理按键
- 已有按键设置 UI 会自动适配从 8 键位扩展到 10 键位（新的 ACTION_LABELS 包含连发标签）
