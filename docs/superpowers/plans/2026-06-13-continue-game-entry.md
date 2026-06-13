# 首页继续游戏入口实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页新增「继续游戏」入口，点击后进入游戏并恢复自动存档；详情浮层按钮根据存档状态切换文案。

**Architecture:** 复用现有 `fc_play_history` 作为最近游玩数据源，新增 `fc_savestates` 本地存储保存/读取 `jsnes.toJSON()` 状态。游戏页在 `beforeunload` 时写自动存档，并在 URL 参数 `continue=1` 时优先恢复。首页和详情浮层读取这两个数据源完成 UI。

**Tech Stack:** JavaScript (ES modules), Vite, jsnes, vitest + jsdom, Playwright

---

### Task 1: 创建存档核心模块

**Files:**
- Create: `src/shared/savestate.js`
- Test: `tests/unit/savestate.test.js`

**说明:**
PRD 依赖 FCG-5.1 的存档/读档核心逻辑，但仓库中尚未实现。本任务先实现最小可用的核心模块，供 FCG-5.2 使用。

- [ ] **Step 1: 写失败测试**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { saveAutoSavestate, loadSavestate, hasSavestate } from '../../src/shared/savestate.js';

describe('savestate', () => {
  beforeEach(() => { localStorage.clear(); });

  it('自动存档后可读取', () => {
    saveAutoSavestate('超级玛莉.nes', { dummy: 'state' });
    expect(hasSavestate('超级玛莉.nes', 'auto')).toBe(true);
    expect(loadSavestate('超级玛莉.nes', 'auto')).toMatchObject({ romId: '超级玛莉.nes', slot: 'auto', state: { dummy: 'state' } });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run tests/unit/savestate.test.js`
Expected: FAIL，模块未定义

- [ ] **Step 3: 实现最小模块**

```js
const STORAGE_KEY = 'fc_savestates';
const SAVESTATE_VERSION = 1;

function readAll() { /* JSON.parse localStorage */ }
function writeAll(data) { /* JSON.stringify localStorage */ }
export function saveAutoSavestate(gameId, state) { /* 写入 auto 槽 */ }
export function saveManualSavestate(gameId, state) { /* 写入 manual 槽 */ }
export function loadSavestate(gameId, slot) { /* 读取并校验 version/romId */ }
export function hasSavestate(gameId, slot) { return !!loadSavestate(...) }
export function deleteSavestate(gameId, slot) { ... }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run tests/unit/savestate.test.js`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/shared/savestate.js tests/unit/savestate.test.js
git commit -m "feat: 添加本地存档/读档核心模块"
```

---

### Task 2: 模拟器暴露序列化接口

**Files:**
- Modify: `src/game/emulator.js`
- Test: `tests/unit/emulator.test.js`（若不存在则创建）

- [ ] **Step 1: 写失败测试**

```js
it('createEmulator 暴露 serializeState / deserializeState', () => {
  const emu = createEmulator();
  expect(typeof emu.serializeState).toBe('function');
  expect(typeof emu.deserializeState).toBe('function');
});
```

- [ ] **Step 2: 实现接口**

在 `createEmulator` 返回对象中新增：

```js
function serializeState() { return nes.toJSON(); }
function deserializeState(state) { nes.fromJSON(state); status = 'loaded'; }
```

- [ ] **Step 3: 运行测试确认通过**

Run: `npx vitest run tests/unit/emulator.test.js`

- [ ] **Step 4: 提交**

```bash
git add src/game/emulator.js tests/unit/emulator.test.js
git commit -m "feat: 模拟器暴露 serializeState/deserializeState"
```

---

### Task 3: 游戏页自动存档与 continue=1 恢复

**Files:**
- Modify: `src/game/main.js`

- [ ] **Step 1: 导入存档模块**

```js
import { saveAutoSavestate, loadSavestate, hasSavestate } from '../shared/savestate.js';
```

- [ ] **Step 2: 在 `beforeunload` 中保存自动存档**

```js
window.addEventListener('beforeunload', () => {
  if (emulator.getStatus() === 'running' || emulator.getStatus() === 'loaded') {
    saveAutoSavestate(romFile, emulator.serializeState());
  }
  // ... existing cleanup
});
```

- [ ] **Step 3: 解析 continue=1 并恢复自动存档**

```js
const shouldContinue = params.get('continue') === '1';
emulator.loadROM(romData);
const autoSave = shouldContinue ? loadSavestate(romFile, 'auto') : null;
if (autoSave && autoSave.state) {
  emulator.deserializeState(autoSave.state);
}
emulator.start();
recordPlayHistory(romFile);
```

- [ ] **Step 4: 提交**

```bash
git add src/game/main.js
git commit -m "feat: 游戏页自动存档与 continue=1 恢复进度"
```

---

### Task 4: 首页新增「继续游戏」区域

**Files:**
- Modify: `src/list/main.js`
- Modify: `src/list/style.css`
- Test: `tests/e2e/continue-game.spec.js`（创建）

- [ ] **Step 1: 在 `index.html` 主内容区前添加容器**

```html
<section class="continue-game" id="continue-game" style="display:none;">
  <h2 class="continue-game__title">▶ 继续游戏</h2>
  <div class="continue-game__card" id="continue-game-card"></div>
</section>
```

- [ ] **Step 2: 在 `main.js` 渲染「继续游戏」卡片**

```js
function renderContinueGame() {
  const history = getAllPlayHistory();
  const entries = Object.entries(history).sort((a, b) => new Date(b[1]) - new Date(a[1]));
  if (entries.length === 0) return;
  const [gameId, lastPlayedAt] = entries[0];
  const game = games.find(g => g.id === gameId);
  if (!game) return;
  // 渲染卡片并绑定点击跳转 /game.html?rom=<id>&continue=1
}
```

- [ ] **Step 3: 添加 `continue-game` 样式**

在 `src/list/style.css` 增加 `.continue-game`、`.continue-game__card` 样式，与现有卡片风格一致。

- [ ] **Step 4: 写 E2E 测试**

```js
import { test, expect } from '@playwright/test';

test('有游玩记录时显示继续游戏卡片', async ({ page }) => {
  await page.goto('/');
  // 先预置 localStorage 游玩记录
  await page.evaluate(() => {
    localStorage.setItem('fc_play_history', JSON.stringify({ '超级玛莉.nes': new Date().toISOString() }));
  });
  await page.reload();
  await expect(page.locator('.continue-game')).toBeVisible();
  await expect(page.locator('.continue-game__card')).toContainText('超级玛莉');
});
```

- [ ] **Step 5: 提交**

```bash
git add index.html src/list/main.js src/list/style.css tests/e2e/continue-game.spec.js
git commit -m "feat: 首页新增继续游戏入口"
```

---

### Task 5: 详情浮层按钮文案根据存档状态切换

**Files:**
- Modify: `src/list/detail-modal.js`
- Modify: `src/list/detail-modal.css`

- [ ] **Step 1: 导入存档检查**

```js
import { hasSavestate } from '../shared/savestate.js';
```

- [ ] **Step 2: 打开浮层时判断存档状态**

```js
const hasAutoSave = hasSavestate(game.id, 'auto');
dom.startBtn.textContent = hasAutoSave ? '▶ 继续游戏' : '▶ 开始游戏';
if (hasAutoSave) {
  const resumeHint = document.createElement('div');
  resumeHint.className = 'resume-hint';
  resumeHint.textContent = '检测到自动存档，点击继续上次进度';
  dom.footer.insertBefore(resumeHint, dom.hint);
}
```

- [ ] **Step 3: 跳转链接区分是否有存档**

```js
function openGame() {
  const hasAutoSave = hasSavestate(game.id, 'auto');
  const url = hasAutoSave ? '/game.html?rom=' + encodeURIComponent(game.id) + '&continue=1' : '/game.html?rom=' + encodeURIComponent(game.id);
  window.location.href = url;
}
```

- [ ] **Step 4: 添加 `.resume-hint` 样式**

在 `detail-modal.css` 中增加绿色/金色提示样式。

- [ ] **Step 5: 提交**

```bash
git add src/list/detail-modal.js src/list/detail-modal.css
git commit -m "feat: 详情浮层按钮根据存档状态切换文案"
```

---

### Task 6: 运行全部测试与验证

- [ ] **Step 1: 运行单元测试**

Run: `npm run test`
Expected: 全部通过

- [ ] **Step 2: 运行 E2E 测试**

Run: `npx playwright test tests/e2e/continue-game.spec.js`
Expected: 通过

- [ ] **Step 3: 手动验证**

Run: `npm run dev`，访问首页，点击游戏进入再返回，确认出现「继续游戏」卡片；点击卡片进入游戏后进度恢复。

- [ ] **Step 4: 提交**

```bash
git commit -m "test: 继续游戏入口单元与 E2E 测试"
```

---

### Spec Coverage Check

| PRD 要求 | 对应任务 |
| --- | --- |
| FR-008 首页仅在有记录时显示继续游戏 | Task 4 |
| FR-009 卡片展示名称/图标/相对时间并跳转 `continue=1` | Task 4 |
| FR-010 游戏页解析 `continue=1` 恢复自动存档 | Task 3 |
| FR-011 普通入口不自动恢复 | Task 3 |
| User Story 2 场景 4 详情浮层按钮文案切换 | Task 5 |
| 存档核心 `Savestate` 实体 | Task 1 |
| 自动存档在离开页面时生成 | Task 3 |

无遗漏。
