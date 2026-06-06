/**
 * 游玩记录存储单元测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { recordPlayHistory, getPlayHistory, getAllPlayHistory } from '../../src/shared/play-history.js';

describe('play-history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初次写入游戏记录应正确存储 ISO 时间戳', () => {
    recordPlayHistory('超级玛莉.nes');
    const result = getPlayHistory('超级玛莉.nes');
    expect(result.lastPlayedAt).toBeTruthy();
    expect(() => new Date(result.lastPlayedAt)).not.toThrow();
  });

  it('读取未玩过的游戏应返回 null', () => {
    const result = getPlayHistory('不存在.nes');
    expect(result.lastPlayedAt).toBeNull();
  });

  it('再次写入应更新已有记录的时间戳', async () => {
    recordPlayHistory('魂斗罗.nes');
    const first = getPlayHistory('魂斗罗.nes').lastPlayedAt;
    // 等待至少 1ms 确保时间戳不同
    await new Promise(r => setTimeout(r, 5));
    recordPlayHistory('魂斗罗.nes');
    const second = getPlayHistory('魂斗罗.nes').lastPlayedAt;
    expect(second).not.toBe(first);
    expect(new Date(second).getTime()).toBeGreaterThanOrEqual(new Date(first).getTime());
  });

  it('getAllPlayHistory 应返回所有记录', () => {
    recordPlayHistory('超级玛莉.nes');
    recordPlayHistory('魂斗罗.nes');
    const all = getAllPlayHistory();
    expect(Object.keys(all)).toHaveLength(2);
    expect(all['超级玛莉.nes']).toBeTruthy();
    expect(all['魂斗罗.nes']).toBeTruthy();
  });

  it('空 gameId 应被忽略', () => {
    recordPlayHistory('');
    recordPlayHistory(null);
    recordPlayHistory(undefined);
    const all = getAllPlayHistory();
    expect(Object.keys(all)).toHaveLength(0);
  });
});
