import { describe, it, expect, beforeEach } from 'vitest';
import { loadKeyBindings, saveKeyBindings, resetKeyBindings } from '../../src/shared/storage.js';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadKeyBindings', () => {
    it('无配置时返回 null', () => {
      expect(loadKeyBindings('超级玛莉.nes')).toBeNull();
    });

    it('返回已保存的配置', () => {
      const bindings = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'Space', b: 'KeyJ', start: 'Enter', select: 'ShiftRight' };
      saveKeyBindings('超级玛莉.nes', bindings);
      const result = loadKeyBindings('超级玛莉.nes');
      expect(result).toEqual(bindings);
    });
  });

  describe('saveKeyBindings', () => {
    it('保存后可通过 loadKeyBindings 读取', () => {
      const bindings = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'KeyZ', b: 'KeyX', start: 'Enter', select: 'ShiftRight' };
      saveKeyBindings('魂斗罗.nes', bindings);
      expect(loadKeyBindings('魂斗罗.nes')).toEqual(bindings);
    });

    it('覆盖已有配置', () => {
      const old = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'KeyJ', b: 'KeyK', start: 'Enter', select: 'ShiftRight' };
      const updated = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'KeyZ', b: 'KeyX', start: 'Enter', select: 'ShiftRight' };
      saveKeyBindings('超级玛莉.nes', old);
      saveKeyBindings('超级玛莉.nes', updated);
      expect(loadKeyBindings('超级玛莉.nes')).toEqual(updated);
    });

    it('多款游戏配置互不干扰', () => {
      const b1 = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'KeyZ', b: 'KeyX', start: 'Enter', select: 'ShiftRight' };
      const b2 = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'Space', b: 'KeyJ', start: 'Enter', select: 'ShiftRight' };
      saveKeyBindings('超级玛莉.nes', b1);
      saveKeyBindings('魂斗罗.nes', b2);
      expect(loadKeyBindings('超级玛莉.nes')).toEqual(b1);
      expect(loadKeyBindings('魂斗罗.nes')).toEqual(b2);
    });
  });

  describe('resetKeyBindings', () => {
    it('删除后返回 null', () => {
      const bindings = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'Space', b: 'KeyJ', start: 'Enter', select: 'ShiftRight' };
      saveKeyBindings('超级玛莉.nes', bindings);
      resetKeyBindings('超级玛莉.nes');
      expect(loadKeyBindings('超级玛莉.nes')).toBeNull();
    });

    it('删除不存在的配置不报错', () => {
      expect(() => resetKeyBindings('不存在的游戏.nes')).not.toThrow();
    });
  });
});
