import jsnes from 'jsnes';
import { createEmulator } from './emulator.js';
import { loadBinding, saveBinding, createInputHandler } from './input.js';
import { createKeybindingUI } from './keybinding-ui.js';

// ====== 主流程 ======
const params = new URLSearchParams(window.location.search);
const romFile = params.get('rom');

// 浏览器能力检测
const canvasEl = document.getElementById('game-canvas');
const unsupportedBanner = document.getElementById('unsupported-banner');
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
    inputHandler = createInputHandler(emulator, bindings);
    document.addEventListener('keydown', inputHandler.onKeyDown);
    document.addEventListener('keyup', inputHandler.onKeyUp);
  }

  // 设置游戏标题
  const gameName = romFile.replace(/\.nes$/i, '');
  document.getElementById('game-title').textContent = gameName;
  document.title = `${gameName} - FC 游戏`;

  // 加载 ROM
  const romUrl = `/roms/${encodeURIComponent(romFile)}`;
  let romData = null;
  try {
    const response = await fetch(romUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    romData = await response.arrayBuffer();
    // 验证 NES ROM 文件头（前 4 字节需为 NES\x1a）
    if (romData.byteLength < 16) throw new Error('文件过小');
    const header = new Uint8Array(romData, 0, 4);
    if (header[0] !== 0x4e || header[1] !== 0x45 || header[2] !== 0x53 || header[3] !== 0x1a) {
      throw new Error('不支持的 ROM 格式');
    }
  } catch {
    showError(`游戏"${gameName}"加载失败。可能文件已损坏或网络错误。`, true);
    return;
  }

  emulator.loadROM(romData);

  // 启动确认流程
  const startOverlay = document.getElementById('start-overlay');
  const coinBtn = document.getElementById('coin-btn');
  const startBtn = document.getElementById('start-btn');

  let coinInserted = false;

  const ctrl = jsnes.Controller;

  coinBtn.addEventListener('click', () => {
    if (emulator.getStatus() === 'loaded' || emulator.getStatus() === 'idle') {
      coinInserted = true;
      startBtn.disabled = false;
      startBtn.textContent = '▶ 开 始 (Start) - 已投币';
      coinBtn.textContent = '🪙 已投币 (Select)';
      // 向模拟器发送 Select 按钮信号（模拟街机投币）
      emulator.buttonDown(0, ctrl.BUTTON_SELECT);
    }
  });

  startBtn.addEventListener('click', () => {
    if (!coinInserted) return;
    startOverlay.classList.add('start-overlay--hidden');
    emulator.setupAudio();
    // 向模拟器发送 Start 按钮信号启动游戏
    emulator.buttonDown(0, ctrl.BUTTON_START);
    emulator.start();
    emulator.buttonUp(0, ctrl.BUTTON_START);
    emulator.buttonUp(0, ctrl.BUTTON_SELECT);
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
    emulator.stop();
  });
}

function showError(msg, showRetry) {
  document.getElementById('start-overlay').classList.add('start-overlay--hidden');
  const errorPanel = document.getElementById('error-panel');
  errorPanel.classList.add('error-overlay--visible');
  document.getElementById('error-msg').textContent = msg;

  if (!showRetry) {
    document.getElementById('retry-btn').style.display = 'none';
  }

  document.getElementById('retry-btn').addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('error-back-btn').addEventListener('click', () => {
    window.location.href = '/';
  });
}
