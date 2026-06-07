
import { createEmulator } from './emulator.js';
import { loadBinding, saveBinding, createInputHandler } from './input.js';
import { createKeybindingUI } from './keybinding-ui.js';
import { recordPlayHistory } from '../shared/play-history.js';
import { trackPageView, trackGameStart, trackGameDuration, flushQueue } from '../shared/analytics.js';
import { isMobileDevice } from '../shared/device.js';
import { createVirtualGamepad } from './virtual-gamepad.js';

// ====== DOM 引用 ======
const canvasEl = document.getElementById('game-canvas');
const unsupportedBanner = document.getElementById('unsupported-banner');
const topbarTitle = document.getElementById('topbar-title');
const errorPanel = document.getElementById('error-panel');
const errorMsg = document.getElementById('error-msg');
const retryBtn = document.getElementById('retry-btn');
const errorBackBtn = document.getElementById('error-back-btn');
const gamepadContainer = document.getElementById('virtual-gamepad');

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
  let audioInitialized = false;

  function ensureAudio() {
    if (audioInitialized || emulator.getStatus() !== 'running') return;
    emulator.setupAudio();
    audioInitialized = true;
  }

  let bindings = loadBinding(romFile);
  let inputHandler = createInputHandler(emulator, bindings, {
    onFirstInteraction: ensureAudio
  });

  function updateInput() {
    document.removeEventListener('keydown', inputHandler.onKeyDown);
    document.removeEventListener('keyup', inputHandler.onKeyUp);
    if (inputHandler.destroy) inputHandler.destroy();
    inputHandler = createInputHandler(emulator, bindings, {
      onFirstInteraction: ensureAudio
    });
    document.addEventListener('keydown', inputHandler.onKeyDown);
    document.addEventListener('keyup', inputHandler.onKeyUp);
  }

  // 设置游戏标题
  const gameName = romFile.replace(/\.nes$/i, '');
  document.title = `${gameName} - FC 游戏`;
  if (topbarTitle) topbarTitle.textContent = gameName;

  let gameStartTime = null;

  document.addEventListener('keydown', inputHandler.onKeyDown);
  document.addEventListener('keyup', inputHandler.onKeyUp);

  // 虚拟手柄初始化（仅移动端）
  let gamepad = null;
  if (isMobileDevice() && gamepadContainer) {
    gamepad = createVirtualGamepad(gamepadContainer, emulator, {
      onFirstInteraction: ensureAudio
    });
    gamepad.show();
  }

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

  // 记录游戏时长的辅助函数
  function recordDuration() {
    if (gameStartTime) {
      const durationSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
      trackGameDuration(gameName, durationSeconds);
      gameStartTime = null;
    }
  }

  // 返回列表
  document.getElementById('back-to-list').addEventListener('click', () => {
    recordDuration();
    window.location.href = '/';
  });

  // 资源释放
  window.addEventListener('beforeunload', () => {
    recordDuration();
    document.removeEventListener('keydown', inputHandler.onKeyDown);
    document.removeEventListener('keyup', inputHandler.onKeyUp);
    if (inputHandler.destroy) inputHandler.destroy();
    emulator.stop();
  });

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
    emulator.start();
    recordPlayHistory(romFile);
    gameStartTime = Date.now();
    trackGameStart(gameName);
  } catch {
    showError(`游戏"${gameName}"加载失败。可能文件已损坏或网络错误。`, true);
  }
}

function showError(msg, showRetry) {
  errorPanel.classList.add('error-overlay--visible');
  errorMsg.textContent = msg;

  if (!showRetry) {
    retryBtn.style.display = 'none';
  }

  retryBtn.addEventListener('click', () => { window.location.reload(); });
  errorBackBtn.addEventListener('click', () => { window.location.href = '/'; });
}

// 埋点：页面浏览追踪（页面加载时，无论游戏是否加载成功）
flushQueue();
trackPageView('/game');
