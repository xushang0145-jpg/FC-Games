/**
 * 性能基准测试
 *
 * 覆盖首页 Largest Contentful Paint 和单个 ROM 加载时间。
 * 阈值设置较宽松，以兼容 CI runner 性能波动。
 */
import { test, expect } from '@playwright/test';

const THRESHOLDS = {
  homeLcpMs: 2500,
  romLoadMs: 3000,
};

test.describe('性能基准', () => {
  test('首页 Largest Contentful Paint 不超过阈值', async ({ page }) => {
    // 在导航前注入 LCP 观察者，避免错过早期绘制
    await page.addInitScript(() => {
      window.__lcpValue = null;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        window.__lcpValue = entries[entries.length - 1].startTime;
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    });

    await page.goto('/');
    // 等待首屏稳定
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const lcp = await page.evaluate(() => window.__lcpValue);
    console.log(`首页 LCP: ${lcp}ms`);
    expect(lcp, '应能获取 LCP 指标').not.toBeNull();
    expect(lcp, `首页 LCP 应 ≤ ${THRESHOLDS.homeLcpMs}ms`).toBeLessThanOrEqual(THRESHOLDS.homeLcpMs);
  });

  test('单个 ROM 加载时间不超过阈值', async ({ request, baseURL }) => {
    const romFile = '超级玛莉.nes';
    const romUrl = `${baseURL}/roms/${encodeURIComponent(romFile)}`;

    const start = performance.now();
    const response = await request.get(romUrl);
    await response.body();
    const duration = performance.now() - start;

    expect(response.ok(), `ROM 请求应返回 200，实际 ${response.status()}`).toBeTruthy();
    console.log(`ROM 加载时间: ${duration}ms (${romFile})`);
    expect(duration, `ROM 加载时间应 ≤ ${THRESHOLDS.romLoadMs}ms`).toBeLessThanOrEqual(THRESHOLDS.romLoadMs);
  });
});
