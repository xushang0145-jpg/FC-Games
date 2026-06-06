import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DEFAULT_BINDINGS, loadBinding, saveBinding, buildCodeMap, createInputHandler } from '../../src/game/input.js';

describe('input', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('DEFAULT_BINDINGS', () => {
    it('包含全部 10 个操作', () => {
      const actions = ['up', 'down', 'left', 'right', 'a', 'b', 'turboA', 'turboB', 'start', 'select'];
      for (const a of actions) {
        expect(DEFAULT_BINDINGS[a]).toBeTruthy();
      }
    });

    it('默认键位使用 WASD+JK 布局', () => {
      expect(DEFAULT_BINDINGS.up).toBe('KeyW');
      expect(DEFAULT_BINDINGS.down).toBe('KeyS');
      expect(DEFAULT_BINDINGS.left).toBe('KeyA');
      expect(DEFAULT_BINDINGS.right).toBe('KeyD');
      expect(DEFAULT_BINDINGS.a).toBe('KeyK');
      expect(DEFAULT_BINDINGS.b).toBe('KeyJ');
    });

    it('连发默认键为 I/U', () => {
      expect(DEFAULT_BINDINGS.turboA).toBe('KeyI');
      expect(DEFAULT_BINDINGS.turboB).toBe('KeyU');
    });

    it('Select/Start 默认键为 Digit1/Digit2', () => {
      expect(DEFAULT_BINDINGS.select).toBe('Digit1');
      expect(DEFAULT_BINDINGS.start).toBe('Digit2');
    });

    it('10 个默认键位互不重复', () => {
      const codes = Object.values(DEFAULT_BINDINGS);
      expect(new Set(codes).size).toBe(10);
    });
  });

  describe('loadBinding', () => {
    it('无配置时返回默认按键', () => {
      const result = loadBinding('超级玛莉.nes');
      expect(result).toEqual(DEFAULT_BINDINGS);
    });

    it('返回已保存的自定义配置', () => {
      const custom = {
        up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
        a: 'Space', b: 'KeyJ', turboA: 'KeyI', turboB: 'KeyU',
        start: 'Enter', select: 'ShiftRight',
      };
      saveBinding('魂斗罗.nes', custom);
      const result = loadBinding('魂斗罗.nes');
      expect(result).toEqual(custom);
    });

    it('旧格式 8 键配置自动补充 turboA/turboB（向后兼容）', () => {
      const oldFormat = {
        up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight',
        a: 'KeyZ', b: 'KeyX', start: 'Enter', select: 'ShiftRight',
      };
      // 模拟旧版本保存的 8 键数据
      localStorage.setItem('nes_keybindings', JSON.stringify({ '魂斗罗.nes': oldFormat }));
      const result = loadBinding('魂斗罗.nes');
      // 旧键位保留
      expect(result.up).toBe('ArrowUp');
      expect(result.a).toBe('KeyZ');
      // 新键位补充
      expect(result.turboA).toBe('KeyI');
      expect(result.turboB).toBe('KeyU');
      expect(Object.keys(result).length).toBe(10);
    });
  });

  describe('saveBinding', () => {
    it('10 键位无冲突时保存成功', () => {
      const custom = {
        up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
        a: 'Space', b: 'KeyJ', turboA: 'KeyI', turboB: 'KeyU',
        start: 'Enter', select: 'ShiftRight',
      };
      const result = saveBinding('超级玛莉.nes', custom);
      expect(result.success).toBe(true);
    });

    it('10 键位重复时拒绝保存', () => {
      const conflict = {
        up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
        a: 'Space', b: 'KeyJ', turboA: 'KeyI', turboB: 'KeyU',
        start: 'Enter', select: 'KeyW',
      };
      const result = saveBinding('超级玛莉.nes', conflict);
      expect(result.success).toBe(false);
    });

    it('保存后读取一致', () => {
      const custom = {
        up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
        a: 'KeyK', b: 'KeyJ', turboA: 'KeyI', turboB: 'KeyU',
        start: 'Digit2', select: 'Digit1',
      };
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

  describe('createInputHandler - turbo 连发', () => {
    let emulator;

    beforeEach(() => {
      vi.useFakeTimers();
      emulator = {
        buttonDown: vi.fn(),
        buttonUp: vi.fn(),
      };
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('按住 turboA 键后以约 12.5 Hz 交替触发 A 按钮', () => {
      const handler = createInputHandler(emulator, DEFAULT_BINDINGS);
      handler.onKeyDown({ code: 'KeyI', repeat: false, preventDefault: vi.fn() });

      // 第一帧：buttonDown
      expect(emulator.buttonDown).toHaveBeenCalledTimes(1);

      // 80ms 后：buttonUp
      vi.advanceTimersByTime(80);
      expect(emulator.buttonUp).toHaveBeenCalledTimes(1);

      // 160ms 后：buttonDown again
      vi.advanceTimersByTime(80);
      expect(emulator.buttonDown).toHaveBeenCalledTimes(2);
    });

    it('松开 turboA 键后立即停止连发', () => {
      const handler = createInputHandler(emulator, DEFAULT_BINDINGS);
      handler.onKeyDown({ code: 'KeyI', repeat: false, preventDefault: vi.fn() });

      vi.advanceTimersByTime(120);
      expect(emulator.buttonUp).toHaveBeenCalledTimes(1);

      handler.onKeyUp({ code: 'KeyI', repeat: false, preventDefault: vi.fn() });

      // 再推进 200ms，不应再有新的调用
      const downCount = emulator.buttonDown.mock.calls.length;
      vi.advanceTimersByTime(200);
      expect(emulator.buttonDown).toHaveBeenCalledTimes(downCount + 0);
    });

    it('turbo 与普通按键互不冲突', () => {
      const handler = createInputHandler(emulator, DEFAULT_BINDINGS);
      handler.onKeyDown({ code: 'KeyI', repeat: false, preventDefault: vi.fn() });
      handler.onKeyDown({ code: 'KeyJ', repeat: false, preventDefault: vi.fn() });

      // 普通 B 按钮也触发
      const bCalls = emulator.buttonDown.mock.calls.filter(c => c[1] !== undefined);
      expect(bCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('destroy 清理所有连发定时器', () => {
      const handler = createInputHandler(emulator, DEFAULT_BINDINGS);
      handler.onKeyDown({ code: 'KeyI', repeat: false, preventDefault: vi.fn() });
      handler.onKeyDown({ code: 'KeyU', repeat: false, preventDefault: vi.fn() });

      const downCount = emulator.buttonDown.mock.calls.length;
      handler.destroy();

      vi.advanceTimersByTime(400);
      expect(emulator.buttonDown).toHaveBeenCalledTimes(downCount + 0);
    });
  });
});
