# 014 — 移动端无声修复方案

## 方案概述

三个改动点，均在 `src/game/` 下：

## 1. `emulator.js` — AudioContext 提前创建 + 错误处理

**改动**: 
- `init()` 中预创建 `AudioContext`（suspended 状态），保存到闭包变量
- `setupAudio()` 改为仅创建 `ScriptProcessorNode` 并连接，然后调用 `resume()` 并处理 Promise rejection
- `stop()` 中关闭时重置 `audioCtx` 为 null

**原因**: AudioContext 提前创建（非用户手势上下文中）→ 状态为 `suspended`。用户交互时仅需 `resume()`，不需创建新实例。这符合移动端 Web Audio 最佳实践，且避免 `resume()` 失败后 `audioInitialized` 已置位导致的死锁。

```js
// init() 末尾添加
audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });

// setupAudio() 改为
function setupAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    }
    audioNode = audioCtx.createScriptProcessor(BUFFER_SIZE, 0, 2);
    // ... onaudioprocess 不变 ...
    audioNode.connect(audioCtx.destination);
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log('AudioContext 已恢复运行');
        }).catch((err) => {
            console.warn('AudioContext.resume() 失败:', err.message);
        });
    }
}
```

## 2. `emulator.js` — `stop()` 中不关闭 AudioContext

**改动**: `stop()` 不再调用 `audioCtx.close()`，仅断连 `audioNode`。AudioContext 在整个页面生命周期中复用。

**原因**: 关闭后重新创建 AudioContext 在移动端可能再次进入 suspended 状态。保持同一实例避免反复解锁。

## 3. `main.js` — Canvas 触摸也触发音频初始化

**改动**: 在 `initGame()` 中，为 `canvasEl` 添加 `touchstart` 监听器，调用 `ensureAudio`。

```js
// 在虚拟手柄初始化之后添加
canvasEl.addEventListener('touchstart', () => {
    ensureAudio();
}, { passive: true });
```

**原因**: 用户可能首先触摸游戏画面而非虚拟手柄。Canvas 区域触摸应同样触发音频初始化。

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/game/emulator.js` | `init()` 预创建 AudioContext；`setupAudio()` 添加 resume() 错误处理；`stop()` 不关闭 AudioContext |
| `src/game/main.js` | Canvas 添加 touchstart 监听触发 ensureAudio |

## 验证方式

1. 桌面 Chrome 启动开发服务器，加载游戏 → 按键播放 → 确认有声音（无回归）
2. 使用 Chrome DevTools 设备模拟切换到移动端 → 触摸虚拟手柄 → 确认声音正常
3. 检查控制台无 `resume() 失败` 日志
