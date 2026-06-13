/**
 * 模拟器封装单元测试
 * 仅验证接口暴露，完整模拟循环依赖浏览器 Canvas/WebAudio。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createEmulator } from '../../src/game/emulator.js';

describe('emulator', () => {
  beforeEach(() => {
    // 提供 getContext 的 canvas 占位
    if (!document.getElementById('test-canvas')) {
      const canvas = document.createElement('canvas');
      canvas.id = 'test-canvas';
      canvas.width = 256;
      canvas.height = 240;
      document.body.appendChild(canvas);
    }
  });

  it('暴露 serializeState/deserializeState 接口', () => {
    const emu = createEmulator();
    expect(typeof emu.serializeState).toBe('function');
    expect(typeof emu.deserializeState).toBe('function');
  });
});
