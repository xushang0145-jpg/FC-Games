# 实现方案：移动端虚拟手柄按钮布局调整

**Branch**: `012-mobile-gamepad-layout` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: 功能规范 `specs/012-mobile-gamepad-layout/spec.md`

## 摘要

调整虚拟手柄三个功能区域的排列顺序：十字键（左）→ 功能键 SELECT/START（中）→ AB 按钮（右）。当前布局是十字键 → AB → 功能键，改为更接近经典游戏手柄的排列。

## 技术上下文

**涉及文件**: `src/game/virtual-gamepad.js`、`src/game/virtual-gamepad.css`

**改动类型**: HTML 结构顺序调整（纯 DOM 顺序变更，无逻辑改动）

**性能影响**: 无。仅改变元素插入顺序，渲染开销不变。

## 宪章合规检查

| 原则 | 状态 | 说明 |
| --- | --- | --- |
| I. SDD | ✅ | 基于 spec.md |
| II. 方案即契约 | ✅ | 仅调整 DOM 顺序 |
| III. 独立可测 | ✅ | 可独立验证布局顺序 |
| IV. 性能 | ✅ | 无性能影响 |
| V. YAGNI | ✅ | 纯调整，无新抽象 |

## 修改范围

### `src/game/virtual-gamepad.js` — DOM 插入顺序调整

**当前顺序** (第 61-74 行):
```
containerEl.appendChild(dpadEl);      // 十字键
containerEl.appendChild(actionsEl);   // AB 按钮
containerEl.appendChild(funcsEl);     // Start/Select
```

**目标顺序**:
```
containerEl.appendChild(dpadEl);      // 十字键（不变）
containerEl.appendChild(funcsEl);     // Start/Select（移至中间）
containerEl.appendChild(actionsEl);   // AB 按钮（移至右侧）
```

### `src/game/virtual-gamepad.css` — 无需修改

当前使用 `justify-content: space-between`，三个区域已自动均匀分布。仅改变 DOM 顺序即可完成布局重排。

## 验证

1. `npm run dev` 启动，移动设备或 Chrome DevTools 移动模拟器访问游戏页
2. 检查虚拟手柄从左到右：十字键 → SELECT/START → A/B
3. 触摸测试每个按钮，确认事件映射正确
4. 测试横屏、竖屏、小屏三种模式
