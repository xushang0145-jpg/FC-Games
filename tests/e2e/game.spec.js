import { test, expect } from '@playwright/test';

test.describe('游戏运行页', () => {
  test('缺少 rom 参数时显示错误', async ({ page }) => {
    await page.goto('/game.html');
    await page.waitForSelector('#error-panel');

    const errorPanel = page.locator('#error-panel');
    await expect(errorPanel).toBeVisible();
  });

  test('不存在的 ROM 显示错误', async ({ page }) => {
    await page.goto('/game.html?rom=不存在的游戏.nes');
    await page.waitForSelector('#error-panel');

    const errorPanel = page.locator('#error-panel');
    await expect(errorPanel).toBeVisible();
  });

  test('启动确认面板显示投币和开始按钮', async ({ page }) => {
    // 使用一个存在的 ROM 测试
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForSelector('#start-overlay');

    const coinBtn = page.locator('#coin-btn');
    const startBtn = page.locator('#start-btn');

    await expect(coinBtn).toBeVisible();
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeDisabled();
  });

  test('投币后开始按钮变为可用', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForSelector('#coin-btn');

    await page.click('#coin-btn');

    const startBtn = page.locator('#start-btn');
    await expect(startBtn).toBeEnabled();
  });

  test('点击返回列表跳转回首页', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForSelector('#back-to-list');

    await page.click('#back-to-list');
    await page.waitForURL('**/');
  });

  test('启动游戏后 Canvas 有非空像素渲染', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');

    // 等待 ROM 加载完成
    await page.waitForFunction(() => {
      const btn = document.getElementById('coin-btn');
      return btn && btn.textContent.includes('投 币');
    }, { timeout: 10000 });

    // 投币 → 开始
    await page.click('#coin-btn');
    await page.click('#start-btn');

    // 等待 start-overlay 消失
    await page.waitForFunction(() => {
      const overlay = document.getElementById('start-overlay');
      return overlay && overlay.classList.contains('start-overlay--hidden');
    }, { timeout: 5000 });

    // 等待几帧渲染
    await page.waitForTimeout(500);

    // 检查 Canvas 像素——至少部分像素不是纯黑
    const hasContent = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonZero = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0) {
          nonZero++;
        }
      }
      return nonZero;
    });
    expect(hasContent).toBeGreaterThan(100);
  });
});
