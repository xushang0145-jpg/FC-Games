/**
 * 虚拟手柄核心模块
 * 提供触摸控制 UI，将触摸输入映射为 jsnes 控制器按键
 */
import jsnes from 'jsnes';

const TOUCH_TOLERANCE = 20;
const HOLD_ZONE_RADIUS = 6;     // 圆形方向键中心保持区半径
const ANGLE_TOLERANCE = 12;     // 方向角度容差带

function getControllerButtons(action) {
  const ctrl = jsnes.Controller;
  const map = {
    up: [ctrl.BUTTON_UP],
    down: [ctrl.BUTTON_DOWN],
    left: [ctrl.BUTTON_LEFT],
    right: [ctrl.BUTTON_RIGHT],
    a: [ctrl.BUTTON_A],
    b: [ctrl.BUTTON_B],
    start: [ctrl.BUTTON_START],
    select: [ctrl.BUTTON_SELECT],
  };
  return map[action] || [];
}

function computeDirectionFromAngle(angle, distance, radius) {
  if (distance > radius + TOUCH_TOLERANCE) return null;
  if (distance < HOLD_ZONE_RADIUS) return { dir: null, actions: [], isHold: true };

  let deg = angle * (180 / Math.PI);
  if (deg < 0) deg += 360;

  const sectors = [
    { dir: 'e',  center: 0,   actions: ['right'] },
    { dir: 'se', center: 45,  actions: ['down', 'right'] },
    { dir: 's',  center: 90,  actions: ['down'] },
    { dir: 'sw', center: 135, actions: ['down', 'left'] },
    { dir: 'w',  center: 180, actions: ['left'] },
    { dir: 'nw', center: 225, actions: ['up', 'left'] },
    { dir: 'n',  center: 270, actions: ['up'] },
    { dir: 'ne', center: 315, actions: ['up', 'right'] },
  ];

  for (const s of sectors) {
    let diff = Math.abs(deg - s.center);
    if (diff > 180) diff = 360 - diff;
    const tol = (s.center % 90 === 0) ? ANGLE_TOLERANCE + 10 : ANGLE_TOLERANCE;
    if (diff <= tol) return { dir: s.dir, actions: s.actions, isHold: false };
  }

  let best = sectors[0];
  let bestDiff = 360;
  for (const s of sectors) {
    let diff = Math.abs(deg - s.center);
    if (diff > 180) diff = 360 - diff;
    if (diff < bestDiff) { bestDiff = diff; best = s; }
  }
  return { dir: best.dir, actions: best.actions, isHold: false };
}

export function createVirtualGamepad(containerEl, emulator, options = {}) {
  const activeTouches = new Map();
  let currentDpadActions = [];

  function createBtn(className, action, innerHTML) {
    const el = document.createElement('div');
    el.className = className;
    if (action) el.setAttribute('data-action', action);
    el.innerHTML = innerHTML || '';
    return el;
  }

  function pressButtons(el, actions) {
    for (const action of actions) for (const btn of getControllerButtons(action)) emulator.buttonDown(1, btn);
    if (el) el.classList.add('gamepad-btn--pressed');
  }

  function releaseButtons(el, actions) {
    for (const action of actions) for (const btn of getControllerButtons(action)) emulator.buttonUp(1, btn);
    if (el) el.classList.remove('gamepad-btn--pressed');
  }

  // ---- 圆形方向键 DOM ----
  function buildRadialDpad() {
    const el = document.createElement('div');
    el.className = 'gamepad-dpad-radial';
    const base = document.createElement('div');
    base.className = 'dpad-radial__base';
    el.appendChild(base);
    for (const a of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
      const arrow = document.createElement('span');
      arrow.className = `dpad-radial__arrow dpad-r--${a}`;
      el.appendChild(arrow);
    }
    const center = document.createElement('div');
    center.className = 'dpad-radial__center';
    center.innerHTML = '<div class="dpad-radial__center-dot"></div>';
    el.appendChild(center);
    return el;
  }

  // ---- A/B 按钮 DOM（横向：B 左 A 右） ----
  function buildActions() {
    const row = document.createElement('div');
    row.className = 'gamepad-actions';
    row.appendChild(createBtn('gamepad-action-btn gamepad-action-btn--b', 'b', 'B'));
    row.appendChild(createBtn('gamepad-action-btn gamepad-action-btn--a', 'a', 'A'));
    return row;
  }

  // ---- Select/Start ----
  function buildFuncs() {
    const el = document.createElement('div');
    el.className = 'gamepad-funcs';
    el.appendChild(createBtn('gamepad-func-btn gamepad-func-btn--select', 'select', 'SELECT'));
    el.appendChild(createBtn('gamepad-func-btn gamepad-func-btn--start', 'start', 'START'));
    return el;
  }

  const dpadEl = buildRadialDpad();
  const actionsEl = buildActions();
  const funcsEl = buildFuncs();
  containerEl.appendChild(dpadEl);
  containerEl.appendChild(funcsEl);
  containerEl.appendChild(actionsEl);

  // ---- 圆形方向键触摸 ----
  function getDpadInfo(touch) {
    const rect = dpadEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    return { cx, cy, radius, dx, dy, dist: Math.sqrt(dx * dx + dy * dy) };
  }

  function isTouchOnDpad(touch) {
    const info = getDpadInfo(touch);
    return info.dist <= info.radius + TOUCH_TOLERANCE;
  }

  function handleDpadTouch(touch) {
    const info = getDpadInfo(touch);
    const angle = Math.atan2(-info.dy, info.dx);
    const result = computeDirectionFromAngle(angle, info.dist, info.radius);

    if (!result) {
      if (currentDpadActions.length > 0) {
        releaseButtons(null, currentDpadActions);
        currentDpadActions = [];
        dpadEl.classList.remove('dpad-radial--pressed');
      }
      return;
    }
    if (result.isHold) return;

    const newActions = result.actions;
    const oldActions = currentDpadActions;
    for (const a of oldActions) if (!newActions.includes(a)) for (const btn of getControllerButtons(a)) emulator.buttonUp(1, btn);
    for (const a of newActions) if (!oldActions.includes(a)) for (const btn of getControllerButtons(a)) emulator.buttonDown(1, btn);
    currentDpadActions = newActions;
    if (newActions.length > 0) dpadEl.classList.add('dpad-radial--pressed');
  }

  function releaseDpad() {
    if (currentDpadActions.length > 0) {
      releaseButtons(null, currentDpadActions);
      currentDpadActions = [];
      dpadEl.classList.remove('dpad-radial--pressed');
    }
  }

  // ---- 通用触摸 ----
  function findActionFromTarget(target) {
    let el = target;
    while (el && el !== containerEl && el !== document.body) {
      const action = el.getAttribute('data-action');
      if (action) return { el, action };
      el = el.parentElement;
    }
    return null;
  }

  containerEl.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (isTouchOnDpad(touch)) {
        handleDpadTouch(touch);
        activeTouches.set(touch.identifier, { type: 'dpad' });
        continue;
      }
      const elAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
      const result = findActionFromTarget(elAtPoint);
      if (result) {
        pressButtons(result.el, [result.action]);
        activeTouches.set(touch.identifier, { type: 'btn', action: result.action, el: result.el });
      }
    }
  }, { passive: false });

  containerEl.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      const cur = activeTouches.get(touch.identifier);
      if (!cur) continue;
      if (cur.type === 'dpad') { handleDpadTouch(touch); continue; }

      const elAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
      const newResult = findActionFromTarget(elAtPoint);
      if (newResult && newResult.action === cur.action && newResult.el === cur.el) continue;

      if (newResult && newResult.action !== cur.action) {
        releaseButtons(cur.el, [cur.action]);
        activeTouches.delete(touch.identifier);
        pressButtons(newResult.el, [newResult.action]);
        activeTouches.set(touch.identifier, { type: 'btn', action: newResult.action, el: newResult.el });
        continue;
      }

      if (cur.el) {
        const rect = cur.el.getBoundingClientRect();
        if (!(touch.clientX >= rect.left - TOUCH_TOLERANCE && touch.clientX <= rect.right + TOUCH_TOLERANCE &&
              touch.clientY >= rect.top - TOUCH_TOLERANCE && touch.clientY <= rect.bottom + TOUCH_TOLERANCE)) {
          releaseButtons(cur.el, [cur.action]);
          activeTouches.delete(touch.identifier);
        }
      }
    }
  }, { passive: false });

  containerEl.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (options.onFirstInteraction) options.onFirstInteraction();
    for (const touch of e.changedTouches) {
      const cur = activeTouches.get(touch.identifier);
      if (!cur) continue;
      if (cur.type === 'dpad') releaseDpad();
      else releaseButtons(cur.el, [cur.action]);
      activeTouches.delete(touch.identifier);
    }
  }, { passive: false });

  containerEl.addEventListener('touchcancel', () => {
    releaseDpad();
    for (const [, cur] of activeTouches) if (cur.type === 'btn') releaseButtons(cur.el, [cur.action]);
    activeTouches.clear();
  }, { passive: false });

  return {
    show() { containerEl.classList.add('virtual-gamepad--visible'); },
    hide() { containerEl.classList.remove('virtual-gamepad--visible'); },
    isVisible() { return containerEl.classList.contains('virtual-gamepad--visible'); },
  };
}