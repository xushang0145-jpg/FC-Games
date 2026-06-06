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

  test('键盘数字 1/2 可完成投币和开始', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');

    // 等待 ROM 加载完成
    await page.waitForFunction(() => {
      const btn = document.getElementById('coin-btn');
      return btn && btn.textContent.includes('投 币');
    }, { timeout: 10000 });

    // 按数字 1（Select/投币）
    await page.keyboard.press('Digit1');

    // 等待模拟器处理
    await page.waitForTimeout(200);

    // 按数字 2（Start/开始）
    await page.keyboard.press('Digit2');

    // 等待 start-overlay 消失
    await page.waitForFunction(() => {
      const overlay = document.getElementById('start-overlay');
      return overlay && overlay.classList.contains('start-overlay--hidden');
    }, { timeout: 5000 });
  });

  test('WASD 方向键和 JK 按钮可触发游戏输入', async ({ page }) => {
    await page.goto('/game.html?rom=超级玛莉.nes');

    // 等待 ROM 加载完成
    await page.waitForFunction(() => {
      const btn = document.getElementById('coin-btn');
      return btn && btn.textContent.includes('投 币');
    }, { timeout: 10000 });

    // 投币 → 开始（用按钮）
    await page.click('#coin-btn');
    await page.click('#start-btn');

    // 等待游戏运行
    await page.waitForFunction(() => {
      const overlay = document.getElementById('start-overlay');
      return overlay && overlay.classList.contains('start-overlay--hidden');
    }, { timeout: 5000 });

    await page.waitForTimeout(300);

    // 验证按键事件能被监听器接收（按下 W/A/S/D/J/K 不会抛异常）
    // Playwright 可发送键盘事件，验证游戏持续运行
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

    await page.waitForFunction(() => {
      const btn = document.getElementById('coin-btn');
      return btn && btn.textContent.includes('投 币');
    }, { timeout: 10000 });

    await page.click('#coin-btn');
    await page.click('#start-btn');

    await page.waitForFunction(() => {
      const overlay = document.getElementById('start-overlay');
      return overlay && overlay.classList.contains('start-overlay--hidden');
    }, { timeout: 5000 });

    await page.waitForTimeout(300);

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
});
