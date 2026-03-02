const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto('https://meal.pin2eat.com/v2/package_store/pages/store/home?store_id=1311', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check what's actually at the bottom of the page
  const bottomElements = await page.evaluate(() => {
    const els = document.elementsFromPoint(187, 790); // center-bottom
    return els.slice(0, 10).map(el => ({
      tag: el.tagName.toLowerCase(),
      class: (el.className || '').substring(0, 80),
      text: (el.innerText || '').substring(0, 30),
      id: el.id || '',
    }));
  });
  console.log('Elements at bottom center (187, 790):');
  bottomElements.forEach(e => console.log(' ', e.tag, e.class, JSON.stringify(e.text)));

  // Check for any visible tabbar-like elements
  const visibleTabs = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const results = [];
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.top > 700 && rect.height > 20 && rect.width > 50) {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          results.push({
            tag: el.tagName.toLowerCase(),
            class: (el.className || '').substring(0, 60),
            text: (el.innerText || '').substring(0, 40),
            rect: { top: Math.round(rect.top), h: Math.round(rect.height), w: Math.round(rect.width) },
          });
        }
      }
      if (results.length > 20) break;
    }
    return results;
  });
  console.log('\nVisible elements near bottom (y>700):');
  visibleTabs.forEach(e => console.log(' ', e.tag, e.class, JSON.stringify(e.text), e.rect));

  // Try touchscreen tap on tabbar area (点餐 should be ~2nd quarter)
  console.log('\nTapping at (187, 790) via touchscreen...');
  await page.touchscreen.tap(187, 790);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'output/screenshots/debug_tap_center.png', fullPage: true });

  // Try tapping where 点餐 tab would be (2nd of 4 tabs = ~140px from left)
  console.log('Tapping at (140, 790) for 点餐...');
  await page.touchscreen.tap(140, 790);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'output/screenshots/debug_tap_menu.png', fullPage: true });

  // Try direct URL navigation for menu page
  const baseUrl = 'https://meal.pin2eat.com/v2/package_store/pages';
  const possibleMenuUrls = [
    baseUrl + '/menu/menu?store_id=1311',
    baseUrl + '/store/menu?store_id=1311',
    baseUrl + '/order/menu?store_id=1311',
  ];

  // Check uni-app router
  const routerInfo = await page.evaluate(() => {
    const info = {};
    // Check for uni global
    if (typeof uni !== 'undefined') {
      info.hasUni = true;
    }
    // Check getCurrentPages
    if (typeof getCurrentPages === 'function') {
      const pages = getCurrentPages();
      info.currentPages = pages.map(p => ({ route: p.route, options: p.options }));
    }
    // Check __uniRoutes
    if (window.__uniRoutes) {
      info.routes = window.__uniRoutes.map(r => ({ path: r.path, meta: r.meta }));
    }
    return info;
  });
  console.log('\nUni-app router info:', JSON.stringify(routerInfo, null, 2));

  // Try uni.switchTab
  console.log('\nTrying uni.switchTab...');
  const switchResult = await page.evaluate(() => {
    return new Promise(resolve => {
      if (typeof uni !== 'undefined' && uni.switchTab) {
        uni.switchTab({
          url: '/pages/store/menu',
          success: () => resolve('success'),
          fail: (e) => resolve('fail: ' + JSON.stringify(e)),
        });
      } else {
        resolve('no uni.switchTab');
      }
    });
  });
  console.log('switchTab result:', switchResult);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'output/screenshots/debug_switchTab.png', fullPage: true });

  await browser.close();
  console.log('\nDone');
})();
