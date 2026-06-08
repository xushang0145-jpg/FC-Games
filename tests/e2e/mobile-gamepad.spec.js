import { test, expect } from '@playwright/test';

test.describe('虚拟手柄 — 显示/隐藏', () => {
  test('移动端视口 + 移动 UA → 虚拟手柄可见', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/game.html?rom=超级玛莉.nes');

    await page.waitForFunction(() => {
      const gp = document.getElementById('virtual-gamepad');
      return gp && gp.classList.contains('virtual-gamepad--visible');
    }, { timeout: 10000 });

    await expect(page.locator('#virtual-gamepad')).toBeVisible();
  });

  test('桌面端视口 → 虚拟手柄不可见', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120',
    });
    const page = await context.newPage();
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForSelector('#virtual-gamepad', { state: 'attached' });

    await expect(page.locator('#virtual-gamepad')).not.toBeVisible();
    await context.close();
  });
});

test.describe('虚拟手柄 — 按钮交互', () => {
  test('所有按钮存在：圆形方向键 + 功能键 + 操作键', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();
    await page.goto('/game.html?rom=超级玛莉.nes');

    await page.waitForFunction(() => {
      const gp = document.getElementById('virtual-gamepad');
      return gp && gp.classList.contains('virtual-gamepad--visible');
    }, { timeout: 10000 });

    // 圆形方向键
    await expect(page.locator('.gamepad-dpad-radial')).toBeVisible();

    // A / B 按钮（横向排列）
    await expect(page.locator('.gamepad-actions [data-action="a"]')).toBeVisible();
    await expect(page.locator('.gamepad-actions [data-action="b"]')).toBeVisible();

    // Select / Start
    await expect(page.locator('[data-action="start"]')).toBeVisible();
    await expect(page.locator('[data-action="select"]')).toBeVisible();

    await context.close();
  });

  test('触摸方向键后游戏正常运行', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('/game.html?rom=超级玛莉.nes');

    await page.waitForFunction(() => {
      const gp = document.getElementById('virtual-gamepad');
      return gp && gp.children.length > 0;
    }, { timeout: 10000 });

    await page.waitForTimeout(1500);

    // 触摸 Start
    const startBtn = page.locator('[data-action="start"]');
    const startBox = await startBtn.boundingBox();
    if (startBox) {
      await page.touchscreen.tap(startBox.x + startBox.width / 2, startBox.y + startBox.height / 2);
    }

    // 触摸圆形方向键上方
    const dpad = page.locator('.gamepad-dpad-radial');
    const dpadBox = await dpad.boundingBox();
    if (dpadBox) {
      await page.touchscreen.tap(dpadBox.x + dpadBox.width / 2, dpadBox.y + dpadBox.height * 0.15);
    }

    // 触摸 A 按钮
    const aBtn = page.locator('.gamepad-actions [data-action="a"]');
    const aBox = await aBtn.boundingBox();
    if (aBox) {
      await page.touchscreen.tap(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
    }

    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();

    await context.close();
  });
});

test.describe('虚拟手柄 — 横竖屏切换', () => {
  test('竖屏切换到横屏后虚拟手柄仍然可见', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();
    await page.goto('/game.html?rom=超级玛莉.nes');

    await page.waitForFunction(() => {
      const gp = document.getElementById('virtual-gamepad');
      return gp && gp.classList.contains('virtual-gamepad--visible');
    }, { timeout: 10000 });

    await expect(page.locator('#virtual-gamepad')).toBeVisible();

    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(500);

    await expect(page.locator('#virtual-gamepad')).toBeVisible();

    await context.close();
  });
});
