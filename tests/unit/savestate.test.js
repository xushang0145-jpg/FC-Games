/**
 * 存档/读档核心模块单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveAutoSavestate,
  saveManualSavestate,
  loadSavestate,
  hasSavestate,
  deleteSavestate,
  listSavestates,
} from '../../src/shared/savestate.js';

describe('savestate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('自动存档后可读取', () => {
    saveAutoSavestate('超级玛莉.nes', { cpu: { pc: 0x8000 } });
    const result = loadSavestate('超级玛莉.nes', 'auto');
    expect(result).not.toBeNull();
    expect(result.romId).toBe('超级玛莉.nes');
    expect(result.slot).toBe('auto');
    expect(result.state).toEqual({ cpu: { pc: 0x8000 } });
    expect(result.version).toBe(1);
    expect(new Date(result.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('手动存档与自动存档互不覆盖', () => {
    saveAutoSavestate('魂斗罗.nes', { auto: true });
    saveManualSavestate('魂斗罗.nes', { manual: true });
    expect(loadSavestate('魂斗罗.nes', 'auto').state).toEqual({ auto: true });
    expect(loadSavestate('魂斗罗.nes', 'manual').state).toEqual({ manual: true });
  });

  it('hasSavestate 在存档存在时返回 true', () => {
    saveAutoSavestate('坦克大战.nes', { x: 1 });
    expect(hasSavestate('坦克大战.nes', 'auto')).toBe(true);
    expect(hasSavestate('坦克大战.nes', 'manual')).toBe(false);
  });

  it('读取版本不匹配的存档返回 null', () => {
    localStorage.setItem('fc_savestates', JSON.stringify({
      '损坏.nes': {
        auto: { romId: '损坏.nes', slot: 'auto', version: 999, createdAt: new Date().toISOString(), state: {} },
      },
    }));
    expect(loadSavestate('损坏.nes', 'auto')).toBeNull();
  });

  it('读取 romId 不匹配的存档返回 null', () => {
    localStorage.setItem('fc_savestates', JSON.stringify({
      '不匹配.nes': {
        auto: { romId: '其他.nes', slot: 'auto', version: 1, createdAt: new Date().toISOString(), state: {} },
      },
    }));
    expect(loadSavestate('不匹配.nes', 'auto')).toBeNull();
  });

  it('deleteSavestate 删除指定槽位', () => {
    saveAutoSavestate('双截龙.nes', { x: 1 });
    deleteSavestate('双截龙.nes', 'auto');
    expect(hasSavestate('双截龙.nes', 'auto')).toBe(false);
    expect(listSavestates('双截龙.nes')).toEqual([]);
  });

  it('空 gameId 不应导致异常', () => {
    expect(saveAutoSavestate('', {})).toBe(false);
    expect(loadSavestate('', 'auto')).toBeNull();
    expect(hasSavestate('', 'auto')).toBe(false);
  });
});
