# 014 — 修复移动端无声问题

**类型**: Bug 修复
**优先级**: P1 (Medium)
**关联**: [bug_mq1x65g0b44tqa]，commit 9584236

## 问题描述

PC 端游戏有声音，手机端（iOS Safari / Android Chrome）没有声音输出。

## 根因分析

commit 9584236 已修复三个根因（`event.outputBuffer` 引用错误、`audioCtx.resume()` 缺失、竞态条件），但移动端仍存在以下残余问题：

### 根因 #1: `audioCtx.resume()` 无错误处理

`setupAudio()` 中 `audioCtx.resume()` 返回 Promise，但未被 await 也未捕获 rejection。移动端浏览器（iOS Safari、Android Chrome）上 AudioContext 始终以 `suspended` 状态创建，必须通过用户手势 `resume()` 解锁。若 `resume()` 因 NotAllowedError 被拒绝，音频静默失败，无日志、无重试。

影响：PC 端 Chrome 在用户手势中创建 AudioContext 后状态为 `running`，不依赖 `resume()`；移动端完全依赖 `resume()` 成功 → 解释了 "PC 有声音，手机没有"。

### 根因 #2: Canvas 区域触摸不触发音频初始化

当前仅虚拟手柄容器（`#virtual-gamepad`）绑定了 `touchstart` 监听来触发音频初始化。游戏画布（`#game-canvas`）区域无触摸监听。用户首次触摸游戏画面区域时不会初始化音频，且 Canvas 区域占屏幕上半部分，是用户自然触摸目标。

### 根因 #3: AudioContext 在每次交互中被重复创建

虽然 `audioInitialized` 标志防止重复，但若 `resume()` 静默失败，`audioInitialized` 已设为 true，AudioContext 永远不会被正确恢复。应将 AudioContext 创建提前到 `init()`，仅 `resume()` 保留在用户交互回调中。

## 验收场景

- **AS-01**: 在 iPhone Safari 上打开游戏，触摸虚拟手柄任意按钮，游戏立即有声音
- **AS-02**: 在 Android Chrome 上打开游戏，触摸游戏画面区域，游戏立即有声音
- **AS-03**: 在桌面 Chrome/Firefox/Safari 上按键盘，游戏有声音（无回归）
- **AS-04**: 若浏览器因策略拒绝音频自动播放，在控制台输出明确日志

## 技术约束

- 不改变 `jsnes` 集成方式
- 不影响 60 fps 模拟性能
- 兼容 iOS Safari 14+、Android Chrome 90+
