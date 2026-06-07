# 功能规范：Web 端默认按键 Start/Select 互换

**Feature Branch**: `013-swap-start-select-keys`

**Created**: 2026-06-07

**Status**: Draft

**Input**: 用户需求 "select 默认 2，start 默认 1"

## 用户场景与测试 *(必填)*

### User Story 1 - Start/Select 默认按键互换 (Priority: P1) 🎯 MVP

桌面上键盘操作的默认按键中，将 Start 和 Select 的绑定互换：Start 从数字 2 改为数字 1，Select 从数字 1 改为数字 2。

**Why this priority**: 数字 1 比数字 2 更靠近左侧常用区，Start 的使用频率远高于 Select，应分配更顺手的按键。

**Independent Test**: 打开任意游戏页（未自定义过按键），按数字 1 触发 Start、按数字 2 触发 Select。

**Acceptance Scenarios**:

1. **Given** 玩家首次打开游戏页（未自定义按键配置），**When** 按下数字 1（Digit1），**Then** 触发游戏 Start 操作
2. **Given** 玩家首次打开游戏页，**When** 按下数字 2（Digit2），**Then** 触发游戏 Select 操作
3. **Given** 玩家之前已自定义保存过按键配置，**When** 再次打开游戏页，**Then** 使用已保存的自定义配置（不受默认值变更影响）

---

### Edge Cases

- 已有自定义键位的老用户：`loadBinding` 从 localStorage 读取已有配置，不受 DEFAULT_BINDINGS 变更影响
- 详情浮层中的按键说明：需同步更新默认按键展示

## 功能需求 *(必填)*

- **FR-001**: `DEFAULT_BINDINGS` 中 `start` 的值 MUST 为 `'Digit1'`
- **FR-002**: `DEFAULT_BINDINGS` 中 `select` 的值 MUST 为 `'Digit2'`
- **FR-003**: 列表页详情浮层的默认按键展示 MUST 同步更新
- **FR-004**: 已有自定义配置的用户 MUST 不受此变更影响

## 成功标准 *(必填)*

- **SC-001**: 新用户 / 清除缓存后首次进入游戏，按 1 为 Start、按 2 为 Select
- **SC-002**: 详情浮层按键说明显示 1→Start、2→Select
- **SC-003**: 已有配置的老用户按键不受影响
- **SC-004**: 所有 E2E 测试（含详情浮层相关测试）通过

## 假设

- 这是纯键值对调，不影响按键系统架构和冲突检测逻辑
- NES 游戏中 Start 使用频率高于 Select，数字 1 位置更优
