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
});
