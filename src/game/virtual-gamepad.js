/**
 * 虚拟手柄核心模块
 * 提供触摸控制 UI，将触摸输入映射为 jsnes 控制器按键
 */
import jsnes from 'jsnes';

const TOUCH_TOLERANCE = 20; // 触摸容差像素

/**
 * 虚拟按键到 jsnes Controller 常量的映射
 * 与 input.js 中 getControllerButton 保持一致
 */
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
 * 创建虚拟手柄
 * @param {HTMLElement} containerEl - 虚拟手柄容器元素
 * @param {object} emulator - jsnes 模拟器实例（需暴露 buttonDown/buttonUp 方法）
 * @returns {object} 手柄控制接口
 */
export function createVirtualGamepad(containerEl, emulator, options = {}) {
  // 跟踪每个手指：Map<identifier, {btnEl, action}>
  const activeTouches = new Map();

  // ---- 创建 DOM 按钮 ----
  function createBtn(className, action, innerHTML) {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute('data-action', action);
    el.innerHTML = innerHTML || '';
    return el;
  }

  // 方向键容器
  const dpadEl = document.createElement('div');
  dpadEl.className = 'gamepad-dpad';
  dpadEl.appendChild(createBtn('gamepad-dpad__btn gamepad-dpad__btn--up', 'up',
    '<span class="gamepad-dpad__arrow">▲</span>'));
  dpadEl.appendChild(createBtn('gamepad-dpad__btn gamepad-dpad__btn--down', 'down',
    '<span class="gamepad-dpad__arrow">▼</span>'));
  dpadEl.appendChild(createBtn('gamepad-dpad__btn gamepad-dpad__btn--left', 'left',
    '<span class="gamepad-dpad__arrow">◀</span>'));
  dpadEl.appendChild(createBtn('gamepad-dpad__btn gamepad-dpad__btn--right', 'right',
    '<span class="gamepad-dpad__arrow">▶</span>'));
  const dpadCenter = document.createElement('div');
  dpadCenter.className = 'gamepad-dpad__center';
  dpadEl.appendChild(dpadCenter);
  containerEl.appendChild(dpadEl);

  // Start / Select 功能键
  const funcsEl = document.createElement('div');
  funcsEl.className = 'gamepad-funcs';
  funcsEl.appendChild(createBtn('gamepad-func-btn gamepad-func-btn--select', 'select', 'SELECT'));
  funcsEl.appendChild(createBtn('gamepad-func-btn gamepad-func-btn--start', 'start', 'START'));
  containerEl.appendChild(funcsEl);

  // A / B 操作按钮
  const actionsEl = document.createElement('div');
  actionsEl.className = 'gamepad-actions';
  actionsEl.appendChild(createBtn('gamepad-action-btn gamepad-action-btn--b', 'b', 'B'));
  actionsEl.appendChild(createBtn('gamepad-action-btn gamepad-action-btn--a', 'a', 'A'));
  containerEl.appendChild(actionsEl);

  // ---- 触摸事件处理 ----
  function findActionFromTarget(target) {
    let el = target;
    while (el && el !== containerEl) {
      const action = el.getAttribute('data-action');
      if (action) return { el, action };
      el = el.parentElement;
    }
    return null;
  }

  function pressBtn(el, action) {
    const btn = getControllerButton(action);
    if (btn === undefined) return;
    el.classList.add('gamepad-btn--pressed');
    emulator.buttonDown(1, btn);
  }

  function releaseBtn(el, action) {
    const btn = getControllerButton(action);
    if (btn === undefined) return;
    el.classList.remove('gamepad-btn--pressed');
    emulator.buttonUp(1, btn);
  }

  containerEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    // 不在 touchstart 中触发音频初始化
    // iOS Safari 不将 touchstart 视为用户激活事件，AudioContext 创建会失败
    // 音频初始化统一在 touchend 中触发（各平台均支持）
    for (const touch of e.changedTouches) {
      const result = findActionFromTarget(document.elementFromPoint(touch.clientX, touch.clientY));
      if (result) {
        pressBtn(result.el, result.action);
        activeTouches.set(touch.identifier, result);
      }
    }
  }, { passive: false });

  containerEl.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const current = activeTouches.get(touch.identifier);
      if (!current) continue;

      const elAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
      const newResult = findActionFromTarget(elAtPoint);

      if (newResult && newResult.action === current.action && newResult.el === current.el) {
        // 手指仍在原按钮内（或容差范围内），保持按下
        continue;
      }

      if (newResult && newResult.action !== current.action) {
        // 手指滑到另一个按钮：释放旧按钮，按下新按钮
        releaseBtn(current.el, current.action);
        activeTouches.delete(touch.identifier);
        pressBtn(newResult.el, newResult.action);
        activeTouches.set(touch.identifier, newResult);
        continue;
      }

      // 手指滑出所有按钮区域：检查是否在容差范围内
      if (current.el) {
        const rect = current.el.getBoundingClientRect();
        const inTolerance =
          touch.clientX >= rect.left - TOUCH_TOLERANCE &&
          touch.clientX <= rect.right + TOUCH_TOLERANCE &&
          touch.clientY >= rect.top - TOUCH_TOLERANCE &&
          touch.clientY <= rect.bottom + TOUCH_TOLERANCE;
        if (!inTolerance) {
          releaseBtn(current.el, current.action);
          activeTouches.delete(touch.identifier);
        }
      }
    }
  }, { passive: false });

  containerEl.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (options.onFirstInteraction) {
      options.onFirstInteraction();
    }
    for (const touch of e.changedTouches) {
      const current = activeTouches.get(touch.identifier);
      if (current) {
        releaseBtn(current.el, current.action);
        activeTouches.delete(touch.identifier);
      }
    }
  }, { passive: false });

  containerEl.addEventListener('touchcancel', (e) => {
    for (const touch of e.changedTouches) {
      const current = activeTouches.get(touch.identifier);
      if (current) {
        releaseBtn(current.el, current.action);
        activeTouches.delete(touch.identifier);
      }
    }
  }, { passive: false });

  // 横竖屏切换自适应：CSS 媒体查询处理视觉布局，此处仅作状态同步
  window.addEventListener('orientationchange', () => {
    // 延迟一帧等待 CSS 媒体查询生效，确保触摸热区与视觉布局一致
    requestAnimationFrame(() => {
      // 清除所有活跃触摸状态（屏幕旋转后触摸上下文失效）
      for (const [, current] of activeTouches) {
        releaseBtn(current.el, current.action);
      }
      activeTouches.clear();
    });
  });

  // ---- 返回控制接口 ----
  return {
    show() {
      containerEl.classList.add('virtual-gamepad--visible');
    },
    hide() {
      containerEl.classList.remove('virtual-gamepad--visible');
    },
    isVisible() {
      return containerEl.classList.contains('virtual-gamepad--visible');
    },
  };
}
