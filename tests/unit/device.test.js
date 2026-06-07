import { describe, it, expect, beforeEach, vi } from 'vitest';

// 在导入前设置 window.innerWidth 默认值
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('isMobileDevice', () => {
  async function getIsMobileDevice() {
    const mod = await import('../../src/shared/device.js?t=' + Math.random());
    return mod.isMobileDevice;
  }

  it('手机 UA + 小屏 → true', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15' });
    vi.stubGlobal('window', { innerWidth: 375 });
    const isMobileDevice = await getIsMobileDevice();
    expect(isMobileDevice()).toBe(true);
  });

  it('桌面 UA + 大屏 → false', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120' });
    vi.stubGlobal('window', { innerWidth: 1440 });
    const isMobileDevice = await getIsMobileDevice();
    expect(isMobileDevice()).toBe(false);
  });

  it('平板 UA + 大屏 → true（平板也需虚拟手柄）', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15' });
    vi.stubGlobal('window', { innerWidth: 1024 });
    const isMobileDevice = await getIsMobileDevice();
    expect(isMobileDevice()).toBe(true);
  });

  it('桌面浏览器模拟移动模式 → true', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15' });
    vi.stubGlobal('window', { innerWidth: 400 });
    const isMobileDevice = await getIsMobileDevice();
    expect(isMobileDevice()).toBe(true);
  });
});
