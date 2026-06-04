import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_BINDINGS, loadBinding, saveBinding, buildCodeMap } from '../../src/game/input.js';

describe('input', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('DEFAULT_BINDINGS', () => {
    it('包含全部 8 个操作', () => {
      const actions = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
      for (const a of actions) {
        expect(DEFAULT_BINDINGS[a]).toBeTruthy();
      }
    });

    it('默认键位不重复', () => {
      const codes = Object.values(DEFAULT_BINDINGS);
      expect(new Set(codes).size).toBe(8);
    });
  });

  describe('loadBinding', () => {
    it('无配置时返回默认按键', () => {
      const result = loadBinding('超级玛莉.nes');
      expect(result).toEqual(DEFAULT_BINDINGS);
    });

    it('返回已保存的自定义配置', () => {
      const custom = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'Space', b: 'KeyJ', start: 'Enter', select: 'ShiftRight' };
      saveBinding('魂斗罗.nes', custom);
      const result = loadBinding('魂斗罗.nes');
      expect(result).toEqual(custom);
    });
  });

  describe('saveBinding', () => {
    it('键位无冲突时保存成功', () => {
      const custom = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'Space', b: 'KeyJ', start: 'Enter', select: 'ShiftRight' };
      const result = saveBinding('超级玛莉.nes', custom);
      expect(result.success).toBe(true);
    });

    it('键位重复时拒绝保存', () => {
      const conflict = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', a: 'Space', b: 'KeyJ', start: 'Enter', select: 'KeyW' };
      const result = saveBinding('超级玛莉.nes', conflict);
      expect(result.success).toBe(false);
    });

    it('保存后读取一致', () => {
      const custom = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', a: 'KeyZ', b: 'KeyX', start: 'Enter', select: 'ShiftRight' };
      saveBinding('魂斗罗.nes', custom);
      expect(loadBinding('魂斗罗.nes')).toEqual(custom);
    });
  });

  describe('buildCodeMap', () => {
    it('将 key→action 映射转为 code→action', () => {
      const bindings = { up: 'KeyW', a: 'Space' };
      const map = buildCodeMap(bindings);
      expect(map['KeyW']).toBe('up');
      expect(map['Space']).toBe('a');
    });
  });
});
