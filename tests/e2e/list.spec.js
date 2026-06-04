import { test, expect } from '@playwright/test';

test.describe('游戏列表页', () => {
  test('页面加载后显示游戏卡片', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-grid');

    const cards = page.locator('.game-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('游戏卡片显示名称', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');

    const firstCardName = page.locator('.game-card__name').first();
    await expect(firstCardName).not.toBeEmpty();
  });

  test('游戏数量显示正确', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-count');

    const countText = await page.textContent('#game-count');
    expect(countText).toContain('共');
    expect(countText).toContain('款游戏');
  });

  test('搜索过滤功能', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-grid');

    await page.fill('#search-input', '超级');
    const visibleCards = page.locator('.game-card:visible').first();
    await expect(visibleCards).toBeVisible();

    const nameEl = visibleCards.locator('.game-card__name');
    const name = await nameEl.textContent();
    expect(name).toContain('超级');
  });

  test('无匹配时显示空状态提示', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-grid');

    await page.fill('#search-input', 'xyz不存在的游戏xyz');
    const emptyState = page.locator('#empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('没有找到匹配的游戏');
  });
});
