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

  test('ROM 加载后无 start-overlay，直接渲染 Canvas', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');

    // start-overlay 不应该存在于 DOM 中
    const overlay = page.locator('#start-overlay');
    await expect(overlay).toHaveCount(0);

    // 顶栏标题显示游戏名称
    const title = page.locator('#topbar-title');
    await expect(title).toHaveText('超级玛莉');

    // Canvas 应该可见
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();
  });

  test('点击返回列表跳转回首页', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForSelector('#back-to-list');

    await page.click('#back-to-list');
    await page.waitForURL('**/');
  });

  test('ROM 加载后 Canvas 直接有非空像素渲染', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');

    // 等待几帧渲染（ROM 加载后直接启动帧循环）
    await page.waitForTimeout(2000);

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

  test('WASD 方向键和 JK 按钮可触发游戏输入', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');

    // 等待 ROM 加载并启动帧循环
    await page.waitForTimeout(2000);

    // 验证按键事件能被监听器接收（按下 W/A/S/D/J/K 不会抛异常）
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyW');

    await page.keyboard.down('KeyA');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyA');

    await page.keyboard.down('KeyD');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyD');

    await page.keyboard.down('KeyJ');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyJ');

    await page.keyboard.down('KeyK');
    await page.waitForTimeout(100);
    await page.keyboard.up('KeyK');

    // 页面不应崩溃（Canvas 仍存在）
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();
  });

  test('连发 I/U 键按住后可正常运行', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');

    await page.waitForTimeout(2000);

    // 按住 I 键（A 连发）500ms
    await page.keyboard.down('KeyI');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyI');

    // 按住 U 键（B 连发）500ms
    await page.keyboard.down('KeyU');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyU');

    // 游戏不应崩溃
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();
  });

  test('帮助按钮可打开键位帮助浮层', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForTimeout(1000);

    await page.locator('#help-btn').click();

    const helpPanel = page.locator('#help-panel');
    await expect(helpPanel).toBeVisible();

    // 帮助表应有 10 行
    const helpRows = page.locator('.help-row');
    await expect(helpRows).toHaveCount(10);
  });

  test('按 H 键可开关键位帮助浮层', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForTimeout(1000);

    const helpPanel = page.locator('#help-panel');
    await expect(helpPanel).not.toBeVisible();

    await page.keyboard.press('KeyH');
    await expect(helpPanel).toBeVisible();

    await page.keyboard.press('KeyH');
    await expect(helpPanel).not.toBeVisible();
  });

  test('帮助浮层显示当前默认键位', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');
    await page.waitForTimeout(1000);

    await page.locator('#help-btn').click();

    const helpRows = page.locator('.help-row');
    await expect(helpRows).toHaveCount(10);

    // Start 显示为 1，Select 显示为 2
    const startRow = helpRows.filter({ hasText: 'Start' });
    await expect(startRow.locator('.help-row__key')).toHaveText('1');

    const selectRow = helpRows.filter({ hasText: 'Select' });
    await expect(selectRow.locator('.help-row__key')).toHaveText('2');
  });
});
