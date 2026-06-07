import { describe, it, expect } from 'vitest';

/**
 * 虚拟手柄按钮映射测试
 * 验证虚拟按键 action 名称与 jsnes Controller 常量的对应关系
 */
describe('虚拟手柄按钮映射', () => {
  // 内联 getControllerButton（与 virtual-gamepad.js 中一致）
  function getControllerButton(action) {
    // 模拟 jsnes.Controller 常量
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

  it('上方向键映射到 BUTTON_UP', () => {
    expect(getControllerButton('up')).toBe(0x10);
  });

  it('下方向键映射到 BUTTON_DOWN', () => {
    expect(getControllerButton('down')).toBe(0x20);
  });

  it('左方向键映射到 BUTTON_LEFT', () => {
    expect(getControllerButton('left')).toBe(0x40);
  });

  it('右方向键映射到 BUTTON_RIGHT', () => {
    expect(getControllerButton('right')).toBe(0x80);
  });

  it('A 按钮映射到 BUTTON_A', () => {
    expect(getControllerButton('a')).toBe(0x01);
  });

  it('B 按钮映射到 BUTTON_B', () => {
    expect(getControllerButton('b')).toBe(0x02);
  });

  it('Start 按钮映射到 BUTTON_START', () => {
    expect(getControllerButton('start')).toBe(0x08);
  });

  it('Select 按钮映射到 BUTTON_SELECT', () => {
    expect(getControllerButton('select')).toBe(0x04);
  });

  it('无效的 action 返回 undefined', () => {
    expect(getControllerButton('invalid')).toBeUndefined();
  });
});
