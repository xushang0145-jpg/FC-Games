import { test, expect } from '@playwright/test';

test.describe('详情浮层', () => {

  test('T012 — 点击卡片弹出详情浮层', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#game-grid');
    await page.waitForSelector('.game-card');

    // 点击第一个游戏卡片
    const firstCard = page.locator('.game-card').first();
    const cardName = await firstCard.locator('.game-card__name').textContent();
    await firstCard.click();

    // 浮层应可见
    const modal = page.locator('.detail-modal');
    await expect(modal).toBeVisible();

    // 浮层标题应与卡片名称一致
    const modalTitle = modal.locator('.detail-modal__title');
    await expect(modalTitle).toHaveText(cardName);
  });

  test('T012 — 遮罩层可见', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.locator('.game-card').first().click();

    const backdrop = page.locator('.detail-backdrop');
    await expect(backdrop).toBeVisible();
  });

  test('T013 — 浮层显示按键操作说明', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.locator('.game-card').first().click();

    // 按键表应有 10 行（与 input.js DEFAULT_BINDINGS 一致）
    const controlRows = page.locator('.control-row');
    await expect(controlRows).toHaveCount(10);

    // 每行应有标签和按键
    const firstRow = controlRows.first();
    await expect(firstRow.locator('.control-row__label')).not.toBeEmpty();
    await expect(firstRow.locator('.control-row__key')).not.toBeEmpty();
  });

  test('T014 — 点击开始游戏按钮跳转', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.locator('.game-card').first().click();

    // 获取卡片 data-game-id 以验证 URL
    const cardEl = page.locator('.game-card').first();
    const gameId = await cardEl.getAttribute('data-game-id');

    // 点击开始游戏应打开新标签页
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('.btn-start').click(),
    ]);

    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toContain('game.html?rom=');
    expect(newPage.url()).toContain(encodeURIComponent(gameId));
    await newPage.close();
  });

  test('T015 — 关闭按钮关闭浮层', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.locator('.game-card').first().click();
    await page.waitForSelector('.detail-modal--visible');

    // 点击关闭按钮
    await page.locator('.detail-modal__close').click();

    // 等待浮层 DOM 被移除（close 函数在 transitionend 或 350ms fallback 后移除）
    await page.locator('.detail-modal').waitFor({ state: 'detached', timeout: 5000 });
  });

  test('T015 — 点击遮罩关闭浮层', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.locator('.game-card').first().click();
    await page.waitForSelector('.detail-modal--visible');

    // 点击遮罩区域（避开浮层面板）
    await page.locator('.detail-backdrop').click({ position: { x: 10, y: 10 } });

    await page.locator('.detail-modal').waitFor({ state: 'detached', timeout: 5000 });
  });

  test('T015 — ESC 键关闭浮层', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.locator('.game-card').first().click();
    await page.waitForSelector('.detail-modal--visible');

    // 按 ESC
    await page.keyboard.press('Escape');

    await page.locator('.detail-modal').waitFor({ state: 'detached', timeout: 5000 });
  });

  test('T030 — Enter 键开始游戏', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForSelector('.game-card');
    await page.locator('.game-card').first().click();

    // 按 Enter 应打开新标签页
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.keyboard.press('Enter'),
    ]);

    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toContain('game.html?rom=');
    await newPage.close();
  });
});
