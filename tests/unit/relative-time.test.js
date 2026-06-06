/**
 * 相对时间格式化单元测试
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatRelativeTime } from '../../src/shared/relative-time.js';

describe('formatRelativeTime', () => {
  it('刚刚 — 小于 1 分钟', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('刚刚');
  });

  it('刚刚 — 未来时间返回 刚刚', () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(formatRelativeTime(future)).toBe('刚刚');
  });

  it('X 分钟前', () => {
    const ago = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ago)).toBe('5 分钟前');
  });

  it('X 小时前', () => {
    const ago = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ago)).toBe('3 小时前');
  });

  it('1 小时前 — 边界值', () => {
    const ago = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ago)).toBe('1 小时前');
  });

  it('昨天', () => {
    const ago = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ago)).toBe('昨天');
  });

  it('X 天前', () => {
    const ago = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ago)).toBe('5 天前');
  });

  it('空字符串返回空', () => {
    expect(formatRelativeTime('')).toBe('');
  });

  it('无效日期返回空', () => {
    expect(formatRelativeTime('not-a-date')).toBe('');
  });
});
