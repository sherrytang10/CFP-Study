const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceScaleFactor: 2,
  });
  await page.goto('https://meal.pin2eat.com/v2/package_store/pages/store/home?store_id=1311', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check tabbar visibility
  const tabInfo = await page.evaluate(() => {
    const items = document.querySelectorAll('.uni-tabbar__item');
    return [...items].map((el, i) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        index: i, text: el.innerText?.trim(),
        rect: { top: Math.round(rect.top), left: Math.round(rect.left), w: Math.round(rect.width), h: Math.round(rect.height) },
        display: style.display, visibility: style.visibility, opacity: style.opacity,
      };
    });
  });
  console.log('Tab items:');
  tabInfo.forEach(t => console.log(JSON.stringify(t)));

  // Check tabbar parent
  const barInfo = await page.evaluate(() => {
    const bar = document.querySelector('uni-tabbar');
    if (!bar) return 'no uni-tabbar';
    const rect = bar.getBoundingClientRect();
    const style = window.getComputedStyle(bar);
    return { rect: { top: Math.round(rect.top), h: Math.round(rect.height) }, display: style.display, position: style.position };
  });
  console.log('\nTabbar:', JSON.stringify(barInfo));

  // Force click on 点餐
  console.log('\nForce click 点餐...');
  const items = await page.$$('.uni-tabbar__item');
  try {
    await items[1].click({ force: true, timeout: 5000 });
    console.log('OK');
  } catch (e) {
    console.log('Failed:', e.message.substring(0, 150));
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'output/screenshots/debug_after_force_click.png', fullPage: true });

  // Try JS click
  console.log('\nJS click 点餐...');
  await page.evaluate(() => {
    const items = document.querySelectorAll('.uni-tabbar__item');
    items[1].click();
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'output/screenshots/debug_after_js_click.png', fullPage: true });

  // Try tap
  console.log('\nTap 点餐...');
  const box = await items[1].boundingBox();
  if (box) {
    console.log('BoundingBox:', JSON.stringify(box));
    await page.tap(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    console.log('No bounding box!');
    // Try locator approach
    const loc = page.locator('.uni-tabbar__item').nth(1);
    await loc.tap({ force: true, timeout: 5000 }).catch(e => console.log('Locator tap failed:', e.message.substring(0, 100)));
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'output/screenshots/debug_after_tap.png', fullPage: true });

  console.log('\nDone');
  await browser.close();
})();
