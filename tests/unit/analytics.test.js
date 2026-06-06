import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getUserId } from '../../src/shared/user-id.js';
import { detectDeviceType } from '../../src/shared/device.js';
import { enqueue, dequeueAll, queueLength } from '../../src/shared/analytics-queue.js';

describe('user-id', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('首次调用生成新的 UUID', () => {
    const uid = getUserId();
    expect(uid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('重复调用返回相同的 UUID', () => {
    const uid1 = getUserId();
    const uid2 = getUserId();
    expect(uid1).toBe(uid2);
  });
});

describe('device', () => {
  it('返回有效的设备类型', () => {
    const type = detectDeviceType();
    expect(['desktop', 'mobile', 'tablet']).toContain(type);
  });
});

describe('analytics-queue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enqueue 和 dequeueAll 正常工作', () => {
    expect(queueLength()).toBe(0);
    enqueue({ event_type: 'page_view', page_path: '/' });
    expect(queueLength()).toBe(1);
    const items = dequeueAll();
    expect(items).toHaveLength(1);
    expect(queueLength()).toBe(0);
  });

  it('超出上限时淘汰最旧数据', () => {
    for (let i = 0; i < 105; i++) {
      enqueue({ id: i });
    }
    const items = dequeueAll();
    expect(items).toHaveLength(100);
    expect(items[0].id).toBe(5); // 最旧的 0-4 被淘汰
  });
});
