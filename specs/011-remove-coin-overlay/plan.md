# 实现方案：去掉投币相关操作，简化游戏启动流程

**Branch**: `011-remove-coin-overlay` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: 功能规范 `specs/011-remove-coin-overlay/spec.md`

## 摘要

移除游戏详情页的投币/开始浮层（start-overlay），ROM 加载完成后直接渲染游戏画面。音频初始化延迟到首次用户按键时执行，以符合 Web Audio API 的用户交互要求。同时将列表页的游戏跳转从新标签页改为当前页。

本功能为纯减法改动（移除代码远多于新增），不引入新依赖，不修改 NES 模拟核心逻辑。

## 技术上下文

**语言/版本**: JavaScript (ES2022+)

**核心依赖**: jsnes@1.2.1（不变）、vite（不变）

**测试**: vitest（单元测试）、playwright（E2E 测试）

**目标平台**: 现代浏览器桌面端（Chrome、Firefox、Safari、Edge 最近 2 个主版本）

**项目类型**: 纯前端 Web 应用增量改动

**性能目标**: 画面渲染维持 60 fps，音频首次激活延迟 <200ms

**约束**:
- 不引入新 npm 依赖
- 不修改 jsnes 模拟核心逻辑
- 虚拟手柄（移动端）功能不受影响
- 埋点追踪功能不受影响

## 宪章合规检查

| 原则 | 状态 | 说明 |
| --- | --- | --- |
| I. 规范驱动开发 (SDD) | ✅ 通过 | 本方案基于已确认的 spec.md 构建 |
| II. 方案即契约 | ✅ 通过 | plan.md 将作为实现的唯一依据 |
| III. 渐进交付与独立可测 | ✅ 通过 | P1 为单一用户故事，可独立验证 |
| IV. 性能即功能 | ✅ 通过 | 仅移除浮层 DOM，不增加渲染负担；音频延迟初始化避免阻塞帧循环 |
| V. 简洁优先 (YAGNI) | ✅ 通过 | 纯减法改动，不引入新抽象或模块 |

## 修改范围

### 1. `src/list/detail-modal.js` — 跳转方式变更

**改动点**: `openGame()` 函数（第 191 行）

```
- window.open('/game.html?rom=' + encodeURIComponent(game.id), '_blank');
+ window.location.href = '/game.html?rom=' + encodeURIComponent(game.id);
```

**影响**: 列表页点击"开始游戏"按钮后，在当前标签页跳转而非新标签页。

### 2. `game.html` — 移除 start-overlay DOM

**移除**: 第 24-34 行整个 `<div class="start-overlay">` 及其子元素。

**新增**: 在顶栏 `.topbar` 内添加游戏标题展示元素：
```html
<span class="topbar__title" id="topbar-title"></span>
```

### 3. `src/game/emulator.js` — 延迟音频初始化

**当前 `start()` 逻辑**:
```javascript
function start() {
    if (!audioCtx) setupAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    status = 'running';
    runFrame();
}
```

**修改后**:
```javascript
function start() {
    status = 'running';
    runFrame();
}
```

**理由**: 不在 `start()` 中初始化音频，避免 AudioContext 在非用户交互上下文中创建导致 `suspended` 状态。`setupAudio()` 保留为独立方法，由外部在合适的时机（首次用户按键）调用。

**注意**: 需同步检查 `display_to_user` 和 `emulator.start()` 的调用关系。当前 `nes.frame()` 产生音频样本写入 `audioBuffer`，在音频未初始化时仅积压缓冲区（约 174KB/s），内存影响可忽略。

### 4. `src/game/input.js` — 首次交互回调

**新增**: 为 `createInputHandler` 添加 `options.onFirstInteraction` 回调参数。

```javascript
export function createInputHandler(emulator, bindings, options = {}) {
  // ... 现有代码 ...
  let audioInitDone = false;

  function onKeyDown(e) {
    // 首次按键时触发音频初始化（在用户交互上下文中）
    if (!audioInitDone && options.onFirstInteraction) {
      audioInitDone = true;
      options.onFirstInteraction();
    }
    // ... 现有按键处理逻辑不变 ...
  }
  // ...
}
```

### 5. `src/game/main.js` — 核心流程重构

#### 移除的内容

| 移除项 | 说明 |
| --- | --- |
| `startOverlay`, `coinBtn`, `startBtn`, `gameTitleEl` DOM 引用 | 对应 HTML 元素已删除 |
| `coinInserted`, `romLoaded`, `gameStartTime` 状态变量 | 不再需要投币/开始状态跟踪 |
| 投币按钮 click 事件监听器（第 65-71 行） | 不再需要投币 UI |
| 开始按钮 click 事件监听器（第 73-89 行） | 不再需要开始 UI |
| `gameTitleEl.textContent` 设置（第 57 行） | 标题移至顶栏 |

#### 新增/调整的内容

**顶栏标题展示**:
```javascript
const topbarTitle = document.createElement('span');
topbarTitle.className = 'topbar__title';
topbarTitle.textContent = gameName;
document.querySelector('.topbar').insertBefore(topbarTitle, document.querySelector('.topbar__spacer'));
```

**ROM 加载完成后直接启动**:
```javascript
// ROM 校验通过后（原 coinBtn 状态更新处）
emulator.loadROM(romData);
emulator.start();                          // 直接启动帧循环
recordPlayHistory(romFile);                // 记录游玩历史
gameStartTime = Date.now();               // 记录开始时间
trackGameStart(gameName);                  // 埋点追踪
```

**音频延迟初始化**（通过 input handler 的 `onFirstInteraction`）:
```javascript
let audioInitialized = false;
let inputHandler = createInputHandler(emulator, bindings, {
  onFirstInteraction: () => {
    if (audioInitialized || emulator.getStatus() !== 'running') return;
    emulator.setupAudio();
    audioInitialized = true;
  }
});
```

**调整后的完整初始化流程**:
```
页面加载 → 浏览器能力检测
  → 初始化 Canvas 和 NES 实例
  → 注册输入监听器（含 onFirstInteraction 回调）
  → 设置顶栏标题
  → fetch ROM
    → ROM 校验通过 → emulator.loadROM() → emulator.start() 启动帧循环
      → 画面开始渲染（无音频）
      → recordPlayHistory() + trackGameStart()
      → 用户首次按键 → onFirstInteraction → emulator.setupAudio() → 音频播放
    → ROM 校验失败 → 显示错误面板
```

### 6. `src/game/style.css` — 移除启动浮层样式

**移除的 CSS 规则**:
- `.start-overlay` 及其所有子选择器：`.start-overlay--hidden`、`.start-panel`、`.start-panel__title`、`.start-panel__subtitle`、`.start-panel__steps`
- `.btn`、`.btn--coin`、`.btn--start`、`.start-panel__hint`

**新增的 CSS 规则**:
```css
.topbar__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-right: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}
```

### 7. `nimbalyst-local/mockups/game-page.mockup.html` — Mockup 同步

移除 mockup 中 `start-overlay` 相关 HTML 和 CSS，保持与实现一致。

## 数据流

```
用户点击列表卡片 → detail-modal openGame()
  → window.location.href = '/game.html?rom=xxx'
    → game.html 加载 → main.js initGame()
      → fetch ROM → 校验通过
        → emulator.loadROM() → emulator.start() → runFrame() 循环
          → onFrame 回调 → Canvas 渲染 60fps ✅
          → onAudioSample 回调 → audioBuffer 积压（等待音频初始化）
        → recordPlayHistory() → localStorage
        → trackGameStart() → analytics
      → 用户首次按键 → onFirstInteraction 回调
        → emulator.setupAudio() → AudioContext 创建 → 音频播放 ✅
```

## 边界情况处理

| 场景 | 处理方式 |
| --- | --- |
| ROM 加载中用户按键 | `onFirstInteraction` 检查 `status !== 'running'` 则跳过，不初始化音频 |
| ROM 加载失败后按键 | 同上，模拟器未进入 running 状态 |
| 缺少 rom 参数 | `showError()` 显示错误，不渲染 Canvas |
| 浏览器不支持 Canvas/WebAudio | 显示 unsupported banner，不进行初始化 |
| audioBuffer 无限增长 | 仅在 ROM 加载到首次按键之间积压（通常 < 10s，约 1-2MB），可接受 |

## 验证方式

1. `npm run dev` 启动开发服务器
2. 列表页点击游戏卡片 → 在当前页跳转到游戏详情页
3. ROM 加载完成后直接显示游戏初始画面（无弹窗）
4. 按 Enter（Start）或 WASD → 游戏响应操作，音频正常播放
5. 按 ESC → 无特殊行为（不再有浮层可关闭）
6. 加载不存在的 ROM → 显示错误面板（重试 + 返回列表按钮可用）
7. 移动端虚拟手柄 → 触碰虚拟按键 → 游戏响应 + 音频正常
