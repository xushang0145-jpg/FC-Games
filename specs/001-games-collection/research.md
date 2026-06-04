# 技术研究：FC 游戏合集

**Date**: 2026-06-04 | **关联方案**: [plan.md](./plan.md)

## 研究项 1：Vite 多页面配置

**决策**: 使用 Vite 原生多页面支持，`index.html`（列表页）和 `game.html`（游戏页）作为两个入口点。

**理由**:
- Vite 通过 `rollupOptions.input` 原生支持多页面，无需额外插件
- 每个 HTML 入口各自加载对应的 JS/CSS，符合 YAGNI——游戏页不需要加载列表页的搜索逻辑
- ROM 文件放在 `roms/` 目录，作为静态资源由 Vite 直接提供，通过 `fetch('/roms/超级玛莉.nes')` 加载

**替代方案评估**:
- SPA 路由（vue-router/react-router）：引入框架依赖，对仅有两个页面的应用过度
- 单页条件渲染：两个页面的 DOM 和逻辑完全不同，混在一起增加复杂度
- Hash 参数传递 ROM：不如 URL search params 语义清晰

## 研究项 2：页面间游戏选择传递

**决策**: 列表页将游戏 ROM 文件名编码为 `game.html` 的 URL 查询参数，游戏页解析该参数加载对应 ROM。

**理由**:
- 从 `index.html` 生成链接：`game.html?rom=超级玛莉.nes` → `window.open(url, '_blank')`
- URL 参数可书签化，玩家可直接收藏游戏链接
- 浏览器原生支持，无跨页面通信需求
- 不依赖 sessionStorage/postMessage 等临时通道

**替代方案评估**:
- window.opener.postMessage：仅在 `window.open` 场景可用，不支持手动输入 URL
- sessionStorage 传递：切换标签页时不可靠，且有同源限制（实际满足但语义不适用）

## 研究项 3：jsnes 集成模式

**决策**: 创建 `src/game/emulator.js` 封装 jsnes，提供 `init(canvas, audioContext)` → `loadROM(arrayBuffer)` → `start()` / `stop()` API。

**关键实现细节**（源自 `node_modules/jsnes/README.md` 和 CLAUDE.md）:
1. **Frame 渲染**: `onFrame(frameBuffer)` → 直接写入 Canvas 2D `ImageData`（256×240→按显示比例缩放），使用 `requestAnimationFrame` 驱动 `nes.frame()`
2. **音频输出**: `onAudioSample(left, right)` → 样本入队到环形缓冲区 → AudioContext 以 44100Hz 播放。AudioContext 需在用户手势（点击"开始"）后 resume
3. **输入处理**: `nes.buttonDown(controller, button)` / `buttonUp` → 映射自 keyboard 事件
4. **ROM 加载**: `nes.loadROM(romData)` → 接收通过 `fetch` 获取的 ArrayBuffer 转换后的字符串

**性能要点**:
- `nes.frame()` 在主线程以约 60 fps 调用，frame 回调体必须轻量（仅像素拷贝）
- 音频缓冲区控制在 8192 样本以内以减小延迟
- 按键事件使用 `keydown`/`keyup` 监听，不在 frame 循环中轮询

## 研究项 4：AudioContext 初始化策略

**决策**: AudioContext 在游戏页加载时创建（suspend 状态），在玩家点击"开始"按钮时通过用户手势 resume。

**理由**:
- 现代浏览器要求 AudioContext 必须在用户手势后启动（autoplay policy）
- 游戏页加载时即可预初始化 AudioContext 和音频节点图，点击"开始"时仅需 `audioCtx.resume()`
- 标签页关闭时通过 `window.addEventListener('beforeunload', ...)` 触发 `audioCtx.close()`

## 研究项 5：localStorage 按键配置存储设计

**决策**: 使用单一 storage key `nes_keybindings`，值为 JSON 对象，以游戏 ROM 文件名为键。

```json
{
  "超级玛莉.nes": {
    "up": "KeyW",
    "down": "KeyS",
    "left": "KeyA",
    "right": "KeyD",
    "a": "Space",
    "b": "KeyJ",
    "start": "Enter",
    "select": "ShiftRight"
  },
  "魂斗罗.nes": { ... }
}
```

**理由**:
- 单一 key 减少 localStorage 碎片，所有配置集中管理
- ROM 文件名作为自然主键（唯一标识）
- 未配置的游戏不在 JSON 中出现，读取时 fallback 到默认值
- `KeyboardEvent.code` 值作为键位标识（物理键位，不受键盘布局影响）

**替代方案评估**:
- 按游戏拆分 key（如 `nes_kb_超级玛莉`）：88 个 key 污染 localStorage 命名空间
- 使用 IndexedDB：对仅存储键位映射的场景过度
