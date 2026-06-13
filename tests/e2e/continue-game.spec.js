import { test, expect } from '@playwright/test';

test.describe('继续游戏入口', () => {
  test('无游玩记录时不显示继续游戏区域', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-grid');

    const continueSection = page.locator('#continue-game');
    await expect(continueSection).toBeHidden();
  });

  test('有游玩记录时显示最近游戏卡片', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-grid');

    await page.evaluate(() => {
      localStorage.setItem('fc_play_history', JSON.stringify({
        '超级玛莉.nes': new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      }));
    });
    await page.reload();
    await page.waitForSelector('#continue-game');

    const continueSection = page.locator('#continue-game');
    await expect(continueSection).toBeVisible();
    await expect(page.locator('.continue-game__name')).toContainText('超级玛莉');
    await expect(page.locator('.continue-game__time')).toContainText('3 分钟前');
  });

  test('点击继续游戏卡片跳转带 continue=1', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-grid');

    await page.evaluate(() => {
      localStorage.setItem('fc_play_history', JSON.stringify({
        '超级玛莉.nes': new Date().toISOString(),
      }));
    });
    await page.reload();
    await page.waitForSelector('#continue-game-card');

    await page.click('#continue-game-card');
    await page.waitForURL(/\/game\.html\?rom=%E8%B6%85%E7%BA%A7%E7%8E%9B%E8%8E%89\.nes&continue=1/);
  });
});
