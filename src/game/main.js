import { createEmulator } from './emulator.js';
import { loadBinding, saveBinding, createInputHandler } from './input.js';
import { createKeybindingUI } from './keybinding-ui.js';
import { recordPlayHistory } from '../shared/play-history.js';
import { trackPageView, trackGameStart, trackGameDuration, flushQueue } from '../shared/analytics.js';
import { isMobileDevice } from '../shared/device.js';
import { createVirtualGamepad } from './virtual-gamepad.js';
import {
  saveState as saveGameState,
  loadState as loadGameState,
  hasState,
  getStateInfo,
  computeCrc32,
  SLOTS,
} from './savestate.js';

// ====== DOM 引用 ======
const canvasEl = document.getElementById('game-canvas');
const unsupportedBanner = document.getElementById('unsupported-banner');
const topbarTitle = document.getElementById('topbar-title');
const errorPanel = document.getElementById('error-panel');
const errorMsg = document.getElementById('error-msg');
const retryBtn = document.getElementById('retry-btn');
const errorBackBtn = document.getElementById('error-back-btn');
const gamepadContainer = document.getElementById('virtual-gamepad');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const confirmBackdrop = document.getElementById('confirm-backdrop');
const confirmPanel = document.getElementById('confirm-panel');
const confirmMsg = document.getElementById('confirm-msg');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
const toastEl = document.getElementById('savestate-toast');

const params = new URLSearchParams(window.location.search);
const romFile = params.get('rom');
const shouldContinue = params.get('continue') === '1';

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

  let romMeta = null;
  let romData = null;
  let autoSaveInterval = null;
  let gameStartTime = null;

  // 加载当前游戏的按键配置
  function ensureAudio() {
    if (emulator.getStatus() !== 'running') return;
    emulator.setupAudio();
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

  document.addEventListener('keydown', inputHandler.onKeyDown);
  document.addEventListener('keyup', inputHandler.onKeyUp);

  // 虚拟手柄初始化（仅移动端）
  let gamepad = null;
  if (isMobileDevice() && gamepadContainer) {
    gamepad = createVirtualGamepad(gamepadContainer, emulator, {
      onFirstInteraction: ensureAudio,
      onSave: handleManualSave,
      onLoad: handleLoad,
      onBack: hideMobileMenu,
    });
    gamepad.show();
  }

  // Canvas 触摸触发音频初始化（touchend 在 iOS/Android 均为有效用户激活事件）
  canvasEl.addEventListener('touchend', () => {
    ensureAudio();
  }, { passive: true });

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

  // ====== 存档/读档逻辑 ======
  function showToast(message, type = 'info') {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = `savestate-toast savestate-toast--${type} savestate-toast--visible`;
    if (toastEl._timer) clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove('savestate-toast--visible');
    }, 3000);
  }

  function performSave(slot) {
    const state = emulator.saveState();
    if (!state) {
      showToast('存档失败：无法获取游戏状态', 'error');
      return;
    }
    const result = saveGameState(romFile, slot, state, romMeta);
    if (result.success) {
      showToast(slot === SLOTS.AUTO ? '自动存档已保存' : '手动存档成功', 'success');
      updateLoadButtonState();
      if (gamepad) gamepad.updateMenuInfo(getSlotInfoText());
    } else {
      showToast(`存档失败：${result.reason}`, 'error');
    }
  }

  function handleManualSave() {
    if (!romMeta) return;
    if (hasState(romFile, SLOTS.MANUAL)) {
      showConfirm('已有手动存档，是否覆盖？', () => {
        performSave(SLOTS.MANUAL);
      });
    } else {
      performSave(SLOTS.MANUAL);
    }
  }

  function handleLoad() {
    if (!romMeta) return;
    const result = loadGameState(romFile, SLOTS.MANUAL, romMeta);
    if (result.success) {
      if (emulator.loadState(result.state)) {
        showToast('读档成功', 'success');
      } else {
        showToast('读档失败：状态恢复出错，已重新开始', 'error');
        reloadRomInitial();
      }
    } else {
      showToast(`读档失败：${result.reason}，已重新开始`, 'error');
      reloadRomInitial();
    }
  }

  function reloadRomInitial() {
    if (!romData) return;
    try {
      emulator.loadROM(romData);
    } catch (e) {
      console.error('重新加载 ROM 失败:', e);
      showError('游戏状态恢复失败，请返回列表重试。', true);
    }
  }

  function handleAutoSave() {
    if (!romMeta || emulator.getStatus() !== 'running') return;
    performSave(SLOTS.AUTO);
  }

  function updateLoadButtonState() {
    if (loadBtn) {
      loadBtn.disabled = !hasState(romFile, SLOTS.MANUAL);
      loadBtn.title = hasState(romFile, SLOTS.MANUAL) ? '读档 (F4)' : '暂无手动存档';
    }
  }

  function getSlotInfoText() {
    const autoInfo = getStateInfo(romFile, SLOTS.AUTO);
    const manualInfo = getStateInfo(romFile, SLOTS.MANUAL);
    return {
      auto: autoInfo ? `自动：${formatRelativeTime(autoInfo.createdAt)}` : '自动：无',
      manual: manualInfo ? `手动：${formatRelativeTime(manualInfo.createdAt)}` : '手动：无',
    };
  }

  function formatRelativeTime(iso) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 10) return '刚刚';
    if (diff < 60) return `${diff} 秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    return `${Math.floor(diff / 3600)} 小时前`;
  }

  // 确认弹窗
  let confirmResolve = null;
  function showConfirm(message, onOk) {
    if (!confirmPanel || !confirmBackdrop) {
      onOk();
      return;
    }
    confirmMsg.textContent = message;
    confirmPanel.classList.add('confirm-panel--open');
    confirmBackdrop.classList.add('confirm-backdrop--visible');
    confirmResolve = (confirmed) => {
      confirmPanel.classList.remove('confirm-panel--open');
      confirmBackdrop.classList.remove('confirm-backdrop--visible');
      if (confirmed && onOk) onOk();
    };
  }

  if (confirmOk) confirmOk.addEventListener('click', () => confirmResolve?.(true));
  if (confirmCancel) confirmCancel.addEventListener('click', () => confirmResolve?.(false));
  if (confirmBackdrop) confirmBackdrop.addEventListener('click', () => confirmResolve?.(false));

  // 顶栏按钮
  if (saveBtn) {
    saveBtn.addEventListener('click', handleManualSave);
    saveBtn.title = '存档 (F2)';
  }
  if (loadBtn) {
    loadBtn.addEventListener('click', handleLoad);
  }

  // 快捷键：F2 存档 / F4 读档
  function onSavestateKey(e) {
    if (e.code === 'F2') {
      e.preventDefault();
      e.stopPropagation();
      handleManualSave();
      return;
    }
    if (e.code === 'F4') {
      e.preventDefault();
      e.stopPropagation();
      handleLoad();
      return;
    }
  }
  document.addEventListener('keydown', onSavestateKey);

  // 返回列表
  document.getElementById('back-to-list').addEventListener('click', () => {
    recordDuration();
    window.location.href = '/';
  });

  // 资源释放
  function cleanup() {
    recordDuration();
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    document.removeEventListener('keydown', inputHandler.onKeyDown);
    document.removeEventListener('keyup', inputHandler.onKeyUp);
    document.removeEventListener('keydown', onSavestateKey);
    if (inputHandler.destroy) inputHandler.destroy();
    emulator.stop();
  }

  window.addEventListener('beforeunload', () => {
    handleAutoSave();
    cleanup();
  });
  window.addEventListener('pagehide', () => {
    handleAutoSave();
  });

  function hideMobileMenu() {
    if (gamepad) gamepad.hideMenu();
  }

  // 加载 ROM
  const romUrl = `/roms/${encodeURIComponent(romFile)}`;
  try {
    const response = await fetch(romUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    romData = await response.arrayBuffer();
    if (romData.byteLength < 16) throw new Error('文件过小');
    const header = new Uint8Array(romData, 0, 4);
    if (header[0] !== 0x4e || header[1] !== 0x45 || header[2] !== 0x53 || header[3] !== 0x1a) {
      throw new Error('不支持的 ROM 格式');
    }

    romMeta = { crc: computeCrc32(romData), length: romData.byteLength };
    emulator.loadROM(romData);

    // 继续游戏：尝试恢复自动存档
    if (shouldContinue) {
      const autoResult = loadGameState(romFile, SLOTS.AUTO, romMeta);
      if (autoResult.success && emulator.loadState(autoResult.state)) {
        showToast('已恢复自动存档', 'success');
      }
    }

    emulator.start();
    recordPlayHistory(romFile);
    gameStartTime = Date.now();
    trackGameStart(gameName);

    // 启动自动存档（30 秒周期）
    autoSaveInterval = setInterval(handleAutoSave, 30000);
    updateLoadButtonState();
    if (gamepad) gamepad.updateMenuInfo(getSlotInfoText());
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
