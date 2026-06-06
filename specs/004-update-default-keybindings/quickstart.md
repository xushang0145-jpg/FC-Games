# Quickstart: 验证更新默认按键映射

**Feature**: 004-update-default-keybindings
**Date**: 2026-06-06

## 前提

```bash
npm install          # 确保依赖已安装
npm run dev          # 启动开发服务器
```

## P1: 默认按键验证

### 1. 清除已保存配置

打开浏览器 DevTools → Application → Local Storage → 删除 `nes_keybindings` 条目（或使用无痕窗口）。

### 2. 验证方向键 WASD

1. 打开任意游戏（如 `http://localhost:5173/game/?rom=超级玛莉.nes`）
2. 投币后开始，按 W → 角色向上
3. 按 A → 角色向左
4. 按 S → 角色向下
5. 按 D → 角色向右

**预期**: 四个方向键均正确响应。

### 3. 验证 AB 按钮 JK

1. 同一游戏中，按 J → B 按钮触发（超级玛莉中为跳跃）
2. 按 K → A 按钮触发（超级玛莉中为加速/射击）

**预期**: J/B、K/A 映射正确。

### 4. 验证 1/2 投币开始

1. 打开游戏（未投币状态）
2. 按数字 1 → 触发 Select（投币）
3. 按数字 2 → 触发 Start（开始游戏）

**预期**: 键盘 1/2 可替代屏幕按钮完成投币+开始流程。

### 5. 运行单元测试

```bash
npx vitest run tests/unit/input.test.js
```

**预期**: 全部通过，包括新默认值测试和 10 键冲突检测。

## P2: 连发功能验证

### 1. A 连发测试

1. 打开射击类游戏（如魂斗罗）
2. 按住 I 键
3. 观察角色持续射击（约每秒 12 次）

**预期**: 按住 I 时持续射击，松开立即停止。

### 2. B 连发 + 普通按键共存

1. 按住 I（A 连发）
2. 同时按 J（普通 B）
3. 两个动作互不干扰

**预期**: 连发和普通按键独立工作。

### 3. 连发释放后状态

1. 按住 I 键 2 秒后松开
2. 角色立即停止射击

**预期**: 松开后 50ms 内停止。

### 4. 快速切换连发

1. 按 I → 松开 → 按 I → 松开（快速连续）
2. 每次按下都应重新开始连发

**预期**: 无异常，每次按下都正常响应。

## P3: 向后兼容验证

### 1. 模拟老用户数据

在浏览器控制台执行：

```js
// 模拟旧版本 8 键配置
localStorage.setItem('nes_keybindings', JSON.stringify({
  '测试游戏.nes': {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    a: 'KeyZ',
    b: 'KeyX',
    start: 'Enter',
    select: 'ShiftRight'
  }
}));
```

### 2. 验证保留 + 补充

1. 打开游戏 `测试游戏.nes`
2. 方向键仍为上箭头（旧配置保留）
3. 按 I 键 → A 连发（新连发默认值补充）
4. 按 U 键 → B 连发（新连发默认值补充）

**预期**: 旧 8 键保留，新 2 键连发自动补充。

### 3. 清除后验证新默认

```js
localStorage.removeItem('nes_keybindings');
```

打开游戏，确认使用完整的 10 键新默认值。

## 性能验证

1. 打开浏览器 DevTools Performance 面板
2. 开始录制
3. 按住 I 键连发 10 秒
4. 停止录制，检查帧率

**预期**: 连发期间帧率稳定在 60 fps，无明显掉帧。
