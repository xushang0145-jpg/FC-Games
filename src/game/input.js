/**
 * 按键映射模块
 * 负责：默认按键配置、从 localStorage 加载/保存、冲突检测、按键监听器工厂
 */
import jsnes from 'jsnes';
import { loadKeyBindings, saveKeyBindings } from '../shared/storage.js';

export const DEFAULT_BINDINGS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  a: 'KeyZ',
  b: 'KeyX',
  start: 'Enter',
  select: 'ShiftRight',
};

export const ACTION_LABELS = {
  up: '↑ 上',
  down: '↓ 下',
  left: '← 左',
  right: '→ 右',
  a: '🅰 A 按钮',
  b: '🅱 B 按钮',
  start: '▶ Start',
  select: '🔘 Select',
};

export function loadBinding(gameId) {
  return loadKeyBindings(gameId) || { ...DEFAULT_BINDINGS };
}

export function saveBinding(gameId, bindings) {
  const codes = Object.values(bindings);
  if (new Set(codes).size !== 8) {
    return { success: false, reason: '有重复按键' };
  }
  saveKeyBindings(gameId, bindings);
  return { success: true };
}

export function buildCodeMap(bindings) {
  const map = {};
  for (const [action, code] of Object.entries(bindings)) {
    map[code] = action;
  }
  return map;
}

function getControllerButton(action) {
  const ctrl = jsnes.Controller;
  return {
    up: ctrl.BUTTON_UP,
    down: ctrl.BUTTON_DOWN,
    left: ctrl.BUTTON_LEFT,
    right: ctrl.BUTTON_RIGHT,
    a: ctrl.BUTTON_A,
    b: ctrl.BUTTON_B,
    start: ctrl.BUTTON_START,
    select: ctrl.BUTTON_SELECT,
  }[action];
}

/**
 * 为当前按键映射创建 keydown/keyup 事件监听器
 */
export function createInputHandler(emulator, bindings) {
  const codeMap = buildCodeMap(bindings);

  function onKeyDown(e) {
    if (e.repeat) return;
    const action = codeMap[e.code];
    if (action) {
      e.preventDefault();
      emulator.buttonDown(0, getControllerButton(action));
    }
  }

  function onKeyUp(e) {
    const action = codeMap[e.code];
    if (action) {
      e.preventDefault();
      emulator.buttonUp(0, getControllerButton(action));
    }
  }

  return { onKeyDown, onKeyUp };
}
