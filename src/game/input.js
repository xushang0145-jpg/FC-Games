/**
 * 按键映射模块
 * 负责：默认按键配置、从 localStorage 加载/保存、冲突检测、按键监听器工厂
 */
import jsnes from 'jsnes';
import { DEFAULT_BINDINGS as BASE_DEFAULT_BINDINGS, ACTION_LABELS } from '../shared/constants.js';
import { loadKeyBindings, saveKeyBindings } from '../shared/storage.js';

/**
 * 游戏输入默认按键映射
 * 在 shared DEFAULT_BINDINGS（8 个基础键）上扩展连发键
 */
export const DEFAULT_BINDINGS = {
  ...BASE_DEFAULT_BINDINGS,
  turboA: 'KeyI',
  turboB: 'KeyU',
};

export { ACTION_LABELS };

export function loadBinding(gameId) {
  const saved = loadKeyBindings(gameId);
  if (saved) return { ...DEFAULT_BINDINGS, ...saved };
  return { ...DEFAULT_BINDINGS };
}

export function saveBinding(gameId, bindings) {
  const codes = Object.values(bindings);
  if (new Set(codes).size !== Object.keys(DEFAULT_BINDINGS).length) {
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
    turboA: ctrl.BUTTON_A,
    turboB: ctrl.BUTTON_B,
    start: ctrl.BUTTON_START,
    select: ctrl.BUTTON_SELECT,
  }[action];
}

/**
 * 为当前按键映射创建 keydown/keyup 事件监听器
 */
export function createInputHandler(emulator, bindings, options = {}) {
  const codeMap = buildCodeMap(bindings);
  const turboState = {};

  const TURBO_ACTIONS = { turboA: 'a', turboB: 'b' };
  const TURBO_INTERVAL = 80; // ~12.5 Hz

  function startTurbo(action, baseAction) {
    if (turboState[action]) return;
    const btn = getControllerButton(baseAction);
    let pressed = false;

    emulator.buttonDown(1, btn);
    pressed = true;

    const id = setInterval(() => {
      if (pressed) {
        emulator.buttonUp(1, btn);
      } else {
        emulator.buttonDown(1, btn);
      }
      pressed = !pressed;
    }, TURBO_INTERVAL);
    turboState[action] = { intervalId: id, pressed };
  }

  function stopTurbo(action) {
    const state = turboState[action];
    if (!state) return;
    clearInterval(state.intervalId);
    delete turboState[action];
  }

  function onKeyDown(e) {
    if (options.onFirstInteraction) {
      options.onFirstInteraction();
    }
    if (e.repeat) return;
    const action = codeMap[e.code];
    if (!action) return;
    e.preventDefault();

    if (action === 'turboA') {
      startTurbo('turboA', 'a');
      return;
    }
    if (action === 'turboB') {
      startTurbo('turboB', 'b');
      return;
    }
    emulator.buttonDown(1, getControllerButton(action));
  }

  function onKeyUp(e) {
    const action = codeMap[e.code];
    if (!action) return;
    e.preventDefault();

    if (action === 'turboA') {
      stopTurbo('turboA');
      emulator.buttonUp(1, getControllerButton('a'));
      return;
    }
    if (action === 'turboB') {
      stopTurbo('turboB');
      emulator.buttonUp(1, getControllerButton('b'));
      return;
    }
    emulator.buttonUp(1, getControllerButton(action));
  }

  function destroy() {
    stopTurbo('turboA');
    stopTurbo('turboB');
  }

  return { onKeyDown, onKeyUp, destroy };
}
