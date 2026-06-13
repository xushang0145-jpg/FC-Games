import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveState,
  loadState,
  hasState,
  getStateInfo,
  clearStates,
  computeCrc32,
  SLOTS,
  SAVESTATE_VERSION,
} from '../../src/game/savestate.js';

describe('savestate', () => {
  const romId = '超级玛莉.nes';
  const romMeta = { crc: 123456789, length: 384512 };
  const mockState = { cpu: { pc: 0x8000 }, ppu: {} };

  beforeEach(() => {
    localStorage.clear();
  });

  describe('computeCrc32', () => {
    it('空 buffer 返回固定值', () => {
      const crc = computeCrc32(new ArrayBuffer(0));
      expect(crc).toBe(0);
    });

    it('相同内容 CRC 一致', () => {
      const buffer = new TextEncoder().encode('hello fc games').buffer;
      expect(computeCrc32(buffer)).toBe(computeCrc32(buffer));
    });
  });

  describe('saveState / loadState', () => {
    it('保存后可读取', () => {
      const saveResult = saveState(romId, SLOTS.MANUAL, mockState, romMeta);
      expect(saveResult.success).toBe(true);
      expect(saveResult.createdAt).toBeDefined();

      const loadResult = loadState(romId, SLOTS.MANUAL, romMeta);
      expect(loadResult.success).toBe(true);
      expect(loadResult.state).toEqual(mockState);
    });

    it('不同游戏存档互不干扰', () => {
      saveState(romId, SLOTS.MANUAL, mockState, romMeta);
      saveState('魂斗罗.nes', SLOTS.MANUAL, { cpu: { pc: 0x9000 } }, { crc: 987654321, length: 256000 });

      expect(loadState(romId, SLOTS.MANUAL, romMeta).success).toBe(true);
      expect(loadState('魂斗罗.nes', SLOTS.MANUAL, { crc: 987654321, length: 256000 }).success).toBe(true);
    });

    it('自动槽与手动槽互不覆盖', () => {
      saveState(romId, SLOTS.AUTO, { cpu: { pc: 0x1111 } }, romMeta);
      saveState(romId, SLOTS.MANUAL, { cpu: { pc: 0x2222 } }, romMeta);

      expect(loadState(romId, SLOTS.AUTO, romMeta).state.cpu.pc).toBe(0x1111);
      expect(loadState(romId, SLOTS.MANUAL, romMeta).state.cpu.pc).toBe(0x2222);
    });

    it('无存档时读取失败', () => {
      const result = loadState(romId, SLOTS.MANUAL, romMeta);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('无存档');
    });
  });

  describe('校验逻辑', () => {
    beforeEach(() => {
      saveState(romId, SLOTS.MANUAL, mockState, romMeta);
    });

    it('ROM 长度不匹配时读取失败', () => {
      const result = loadState(romId, SLOTS.MANUAL, { ...romMeta, length: romMeta.length + 1 });
      expect(result.success).toBe(false);
      expect(result.reason).toContain('长度不匹配');
    });

    it('CRC 不匹配时读取失败', () => {
      const result = loadState(romId, SLOTS.MANUAL, { ...romMeta, crc: romMeta.crc + 1 });
      expect(result.success).toBe(false);
      expect(result.reason).toContain('校验失败');
    });

    it('版本不匹配时读取失败', () => {
      const raw = localStorage.getItem('fc_savestates');
      const all = JSON.parse(raw);
      all[romId][SLOTS.MANUAL].version = SAVESTATE_VERSION + 1;
      localStorage.setItem('fc_savestates', JSON.stringify(all));

      const result = loadState(romId, SLOTS.MANUAL, romMeta);
      expect(result.success).toBe(false);
      expect(result.reason).toContain('版本不兼容');
    });
  });

  describe('辅助函数', () => {
    it('hasState 正确判断存档存在', () => {
      expect(hasState(romId, SLOTS.MANUAL)).toBe(false);
      saveState(romId, SLOTS.MANUAL, mockState, romMeta);
      expect(hasState(romId, SLOTS.MANUAL)).toBe(true);
    });

    it('getStateInfo 返回元数据且不包含 state', () => {
      saveState(romId, SLOTS.MANUAL, mockState, romMeta);
      const info = getStateInfo(romId, SLOTS.MANUAL);
      expect(info).toMatchObject({
        romId,
        slot: SLOTS.MANUAL,
        version: SAVESTATE_VERSION,
        romCrc: romMeta.crc,
        romLength: romMeta.length,
      });
      expect(info.createdAt).toBeDefined();
      expect(info.state).toBeUndefined();
    });

    it('clearStates 删除游戏存档', () => {
      saveState(romId, SLOTS.MANUAL, mockState, romMeta);
      clearStates(romId);
      expect(hasState(romId, SLOTS.MANUAL)).toBe(false);
    });
  });

  describe('存储写满', () => {
    it('写满时保留上一次成功存档', () => {
      saveState(romId, SLOTS.MANUAL, mockState, romMeta);

      const originalSetItem = Storage.prototype.setItem;
      let failCount = 0;
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
        if (key === 'fc_savestates' && failCount < 1) {
          failCount++;
          throw new Error('QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      });

      const result = saveState(romId, SLOTS.MANUAL, { cpu: { pc: 0x9999 } }, romMeta);
      expect(result.success).toBe(false);

      // 上一次成功存档应保留
      const loadResult = loadState(romId, SLOTS.MANUAL, romMeta);
      expect(loadResult.success).toBe(true);
      expect(loadResult.state).toEqual(mockState);

      vi.restoreAllMocks();
    });
  });
});
