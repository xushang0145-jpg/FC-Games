import { test, expect } from '@playwright/test';

test.describe('虚拟手柄 — 显示/隐藏', () => {
  test('移动端视口 + 移动 UA → 虚拟手柄可见', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Playwright 的 iPhone 模拟默认设置正确的 UA
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForSelector('#virtual-gamepad');

    const gamepad = page.locator('#virtual-gamepad');
    await expect(gamepad).toBeVisible();
  });

  test('桌面端视口 → 虚拟手柄不可见', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120',
    });
    const page = await context.newPage();
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForSelector('#virtual-gamepad', { state: 'attached' });

    const gamepad = page.locator('#virtual-gamepad');
    await expect(gamepad).not.toBeVisible();
    await context.close();
  });
});

test.describe('虚拟手柄 — 按钮交互', () => {
  test('方向键和 A/B 按钮存在于虚拟手柄中', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await context.newPage();
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForSelector('#virtual-gamepad');

    // 方向键
    await expect(page.locator('[data-action="up"]')).toBeVisible();
    await expect(page.locator('[data-action="down"]')).toBeVisible();
    await expect(page.locator('[data-action="left"]')).toBeVisible();
    await expect(page.locator('[data-action="right"]')).toBeVisible();

    // A / B 按钮
    await expect(page.locator('[data-action="a"]')).toBeVisible();
    await expect(page.locator('[data-action="b"]')).toBeVisible();

    // Start / Select 按钮
    await expect(page.locator('[data-action="start"]')).toBeVisible();
    await expect(page.locator('[data-action="select"]')).toBeVisible();

    await context.close();
  });

  test('触摸方向键按钮后游戏正常运行', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('/game.html?rom=超级玛莉.nes');

    // 等待 ROM 加载 + 虚拟手柄显示
    await page.waitForFunction(() => {
      const btn = document.getElementById('coin-btn');
      const gp = document.getElementById('virtual-gamepad');
      return btn && btn.textContent.includes('投 币') && gp && gp.children.length > 0;
    }, { timeout: 10000 });

    // 触摸 Start 按钮开始游戏
    const startBtn = page.locator('[data-action="start"]');
    const box = await startBtn.boundingBox();
    if (box) {
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }

    // 触摸方向键
    const upBtn = page.locator('[data-action="up"]');
    const upBox = await upBtn.boundingBox();
    if (upBox) {
      await page.touchscreen.tap(upBox.x + upBox.width / 2, upBox.y + upBox.height / 2);
    }

    // 触摸 A 按钮
    const aBtn = page.locator('[data-action="a"]');
    const aBox = await aBtn.boundingBox();
    if (aBox) {
      await page.touchscreen.tap(aBox.x + aBox.width / 2, aBox.y + aBox.height / 2);
    }

    // 游戏页面不应崩溃
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
    await page.waitForSelector('#virtual-gamepad');

    await expect(page.locator('#virtual-gamepad')).toBeVisible();

    // 切换到横屏
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);

    await expect(page.locator('#virtual-gamepad')).toBeVisible();

    await context.close();
  });
});
