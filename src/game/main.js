import jsnes from 'jsnes';
import { createEmulator } from './emulator.js';
import { loadBinding, saveBinding, createInputHandler } from './input.js';
import { createKeybindingUI } from './keybinding-ui.js';
import { recordPlayHistory } from '../shared/play-history.js';

// ====== DOM 引用 ======
const canvasEl = document.getElementById('game-canvas');
const unsupportedBanner = document.getElementById('unsupported-banner');
const startOverlay = document.getElementById('start-overlay');
const coinBtn = document.getElementById('coin-btn');
const startBtn = document.getElementById('start-btn');
const gameTitleEl = document.getElementById('game-title');
const errorPanel = document.getElementById('error-panel');
const errorMsg = document.getElementById('error-msg');
const retryBtn = document.getElementById('retry-btn');
const errorBackBtn = document.getElementById('error-back-btn');

const params = new URLSearchParams(window.location.search);
const romFile = params.get('rom');

// 浏览器能力检测
const hasCanvas = !!canvasEl.getContext;
const hasWebAudio = !!(window.AudioContext || window.webkitAudioContext);

if (!hasCanvas || !hasWebAudio) {
  unsupportedBanner.classList.add('unsupported-banner--visible');
} else if (!romFile) {
  showError('未指定游戏。请从游戏列表页面选择游戏。', false);
} else {
  initGame(romFile);
}

async function initGame(romFile) {
  const emulator = createEmulator();
  emulator.init(canvasEl);

  // 加载当前游戏的按键配置
  let bindings = loadBinding(romFile);
  let inputHandler = createInputHandler(emulator, bindings);

  function updateInput() {
    document.removeEventListener('keydown', inputHandler.onKeyDown);
    document.removeEventListener('keyup', inputHandler.onKeyUp);
    if (inputHandler.destroy) inputHandler.destroy();
    inputHandler = createInputHandler(emulator, bindings);
    document.addEventListener('keydown', inputHandler.onKeyDown);
    document.addEventListener('keyup', inputHandler.onKeyUp);
  }

  // 设置游戏标题
  const gameName = romFile.replace(/\.nes$/i, '');
  gameTitleEl.textContent = gameName;
  document.title = `${gameName} - FC 游戏`;

  // 先注册 UI 事件监听器（避免 ROM 加载期间用户点击无响应）
  let coinInserted = false;
  let romLoaded = false;

  coinBtn.addEventListener('click', () => {
    if (!romLoaded) return;
    coinInserted = true;
    startBtn.disabled = false;
    startBtn.textContent = '▶ 开 始 (Start) - 已投币';
    coinBtn.textContent = '🪙 已投币 (Select)';
  });

  startBtn.addEventListener('click', () => {
    if (!coinInserted || !romLoaded) return;
    startOverlay.classList.add('start-overlay--hidden');
    emulator.setupAudio();
    emulator.start();
    recordPlayHistory(romFile);
    // 投币 + 开始：向模拟器发送 Select 再 Start
    const ctrl = jsnes.Controller;
    emulator.buttonDown(1, ctrl.BUTTON_SELECT);
    setTimeout(() => {
      emulator.buttonUp(1, ctrl.BUTTON_SELECT);
      emulator.buttonDown(1, ctrl.BUTTON_START);
      setTimeout(() => emulator.buttonUp(1, ctrl.BUTTON_START), 50);
    }, 50);
  });

  document.addEventListener('keydown', inputHandler.onKeyDown);
  document.addEventListener('keyup', inputHandler.onKeyUp);

  // 按键设置面板
  const keybindingUI = createKeybindingUI(bindings, (newBindings) => {
    const result = saveBinding(romFile, newBindings);
    if (result.success) {
      bindings = { ...newBindings };
      updateInput();
      keybindingUI.updateBindings(bindings);
    }
    return result;
  });

  // 返回列表
  document.getElementById('back-to-list').addEventListener('click', () => {
    window.location.href = '/';
  });

  // 资源释放
  window.addEventListener('beforeunload', () => {
    document.removeEventListener('keydown', inputHandler.onKeyDown);
    document.removeEventListener('keyup', inputHandler.onKeyUp);
    if (inputHandler.destroy) inputHandler.destroy();
    emulator.stop();
  });

  // 显示 ROM 加载中状态
  coinBtn.textContent = '⏳ 加载中...';
  coinBtn.style.pointerEvents = 'none';

  // 加载 ROM
  const romUrl = `/roms/${encodeURIComponent(romFile)}`;
  try {
    const response = await fetch(romUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const romData = await response.arrayBuffer();
    if (romData.byteLength < 16) throw new Error('文件过小');
    const header = new Uint8Array(romData, 0, 4);
    if (header[0] !== 0x4e || header[1] !== 0x45 || header[2] !== 0x53 || header[3] !== 0x1a) {
      throw new Error('不支持的 ROM 格式');
    }
    emulator.loadROM(romData);
    romLoaded = true;
    coinBtn.textContent = '🪙 投 币 (Select)';
    coinBtn.style.pointerEvents = '';
  } catch {
    showError(`游戏"${gameName}"加载失败。可能文件已损坏或网络错误。`, true);
  }
}

function showError(msg, showRetry) {
  startOverlay.classList.add('start-overlay--hidden');
  errorPanel.classList.add('error-overlay--visible');
  errorMsg.textContent = msg;

  if (!showRetry) {
    retryBtn.style.display = 'none';
  }

  retryBtn.addEventListener('click', () => { window.location.reload(); });
  errorBackBtn.addEventListener('click', () => { window.location.href = '/'; });
}
