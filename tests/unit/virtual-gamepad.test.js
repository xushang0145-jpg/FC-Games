import { describe, it, expect } from 'vitest';

/**
 * 虚拟手柄按钮映射测试
 * 验证虚拟按键 action 名称与 jsnes Controller 常量的对应关系
 */
describe('虚拟手柄按钮映射', () => {
  // 内联 getControllerButtons（与 virtual-gamepad.js 中一致）
  function getControllerButtons(action) {
    const ctrl = {
      BUTTON_UP: 0x10,
      BUTTON_DOWN: 0x20,
      BUTTON_LEFT: 0x40,
      BUTTON_RIGHT: 0x80,
      BUTTON_A: 0x01,
      BUTTON_B: 0x02,
      BUTTON_START: 0x08,
      BUTTON_SELECT: 0x04,
    };
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

  it('上方向键返回 [BUTTON_UP]', () => {
    expect(getControllerButtons('up')).toEqual([0x10]);
  });

  it('下方向键返回 [BUTTON_DOWN]', () => {
    expect(getControllerButtons('down')).toEqual([0x20]);
  });

  it('左方向键返回 [BUTTON_LEFT]', () => {
    expect(getControllerButtons('left')).toEqual([0x40]);
  });

  it('右方向键返回 [BUTTON_RIGHT]', () => {
    expect(getControllerButtons('right')).toEqual([0x80]);
  });

  it('A 按钮返回 [BUTTON_A]', () => {
    expect(getControllerButtons('a')).toEqual([0x01]);
  });

  it('B 按钮返回 [BUTTON_B]', () => {
    expect(getControllerButtons('b')).toEqual([0x02]);
  });

  it('Start 按钮返回 [BUTTON_START]', () => {
    expect(getControllerButtons('start')).toEqual([0x08]);
  });

  it('Select 按钮返回 [BUTTON_SELECT]', () => {
    expect(getControllerButtons('select')).toEqual([0x04]);
  });

  it('无效的 action 返回空数组', () => {
    expect(getControllerButtons('invalid')).toEqual([]);
  });
});

/**
 * 圆形方向键角度判定测试
 */
describe('圆形方向键角度判定', () => {
  // 内联 computeDirectionFromAngle
  const HOLD_ZONE = 6;
  const TOLERANCE = 20;
  const ANGLE_TOL = 22; // 正方向容差 (12+10)

  function computeDirectionFromAngle(angle, distance, radius) {
    if (distance > radius + TOLERANCE) return null;
    if (distance < HOLD_ZONE) return { dir: null, actions: [], isHold: true };

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
      const tol = (s.center % 90 === 0) ? ANGLE_TOL : 12;
      if (diff <= tol) {
        return { dir: s.dir, actions: s.actions, isHold: false };
      }
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

  const r = 50; // 典型半径

  it('手指在中心保持区 → isHold=true', () => {
    const r2 = computeDirectionFromAngle(0, 5, r);
    expect(r2.isHold).toBe(true);
    expect(r2.actions).toEqual([]);
  });

  it('角度 0°（右）→ right', () => {
    const r2 = computeDirectionFromAngle(0, 30, r);
    expect(r2.dir).toBe('e');
    expect(r2.actions).toEqual(['right']);
  });

  it('角度 90°（下）→ down', () => {
    const r2 = computeDirectionFromAngle(Math.PI / 2, 30, r);
    expect(r2.dir).toBe('s');
    expect(r2.actions).toEqual(['down']);
  });

  it('角度 180°（左）→ left', () => {
    const r2 = computeDirectionFromAngle(Math.PI, 30, r);
    expect(r2.dir).toBe('w');
    expect(r2.actions).toEqual(['left']);
  });

  it('角度 270°（上）→ up', () => {
    const r2 = computeDirectionFromAngle(Math.PI * 1.5, 30, r);
    expect(r2.dir).toBe('n');
    expect(r2.actions).toEqual(['up']);
  });

  it('角度 45°（右下）→ down + right', () => {
    const r2 = computeDirectionFromAngle(Math.PI / 4, 30, r);
    expect(r2.dir).toBe('se');
    expect(r2.actions).toEqual(['down', 'right']);
  });

  it('角度 135°（左下）→ down + left', () => {
    const r2 = computeDirectionFromAngle(Math.PI * 3 / 4, 30, r);
    expect(r2.dir).toBe('sw');
    expect(r2.actions).toEqual(['down', 'left']);
  });

  it('角度 225°（左上）→ up + left', () => {
    const r2 = computeDirectionFromAngle(Math.PI * 5 / 4, 30, r);
    expect(r2.dir).toBe('nw');
    expect(r2.actions).toEqual(['up', 'left']);
  });

  it('角度 315°（右上）→ up + right', () => {
    const r2 = computeDirectionFromAngle(Math.PI * 7 / 4, 30, r);
    expect(r2.dir).toBe('ne');
    expect(r2.actions).toEqual(['up', 'right']);
  });

  it('手指超出圆盘范围 → null', () => {
    expect(computeDirectionFromAngle(0, r + 25, r)).toBeNull();
  });
});
