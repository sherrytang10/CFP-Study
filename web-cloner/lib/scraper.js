const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Mobile viewport matching target SPA
const VIEWPORT = { width: 375, height: 812 };
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

// Tab pages discovered from uni-app router (isTabBar: true)
const TAB_PAGES = [
  { name: 'home', route: '/pages/store/home', label: '首页' },
  { name: 'menu', route: '/pages/store/menu', label: '点餐' },
  { name: 'orders', route: '/pages/store/order', label: '订单' },
  { name: 'profile', route: '/pages/store/mine', label: '我的' },
];

/**
 * Render a SPA page with Playwright, navigate through all tab pages
 * using uni.switchTab(), collect resources and take full-page screenshots.
 * @param {string} url - Target URL (entry page)
 * @param {string} screenshotDir - Directory for original screenshots
 * @returns {{ html: string, resources: Array, pages: Array<{name, screenshot}> }}
 */
async function scrape(url, screenshotDir) {
  const resources = [];
  const seen = new Set();

  console.log('[scraper] Launching browser (mobile 375x812)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent: MOBILE_UA,
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const page = await context.newPage();

  // Intercept all responses to collect resource URLs (across all page navigations)
  page.on('response', (response) => {
    const resUrl = response.url();
    const ct = response.headers()['content-type'] || '';
    if (seen.has(resUrl)) return;
    seen.add(resUrl);

    let type = 'other';
    if (ct.includes('text/css') || /\.css(\?|$)/i.test(resUrl)) type = 'css';
    else if (ct.includes('javascript') || /\.js(\?|$)/i.test(resUrl)) type = 'js';
    else if (ct.includes('image/') || /\.(png|jpg|jpeg|gif|svg|webp|ico)(\?|$)/i.test(resUrl)) type = 'image';
    else if (ct.includes('font') || /\.(woff2?|ttf|eot|otf)(\?|$)/i.test(resUrl)) type = 'font';
    else if (ct.includes('text/html')) type = 'html';

    if (type !== 'html' && type !== 'other') {
      resources.push({ url: resUrl, type, contentType: ct });
    }
  });

  // Step 1: Navigate to the entry URL
  console.log(`[scraper] Navigating to ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`[scraper] Navigation warning: ${e.message}, continuing...`);
  }
  await page.waitForTimeout(3000);

  fs.mkdirSync(screenshotDir, { recursive: true });
  const pages = [];

  // Step 2: Screenshot the entry page (package_store home)
  console.log('[scraper] Capturing: Entry page (package_store home)');
  await scrollFullPage(page);
  const entryShot = path.join(screenshotDir, 'original_entry.png');
  await page.screenshot({ path: entryShot, fullPage: true });
  pages.push({ name: 'entry', screenshot: entryShot });

  // Step 3: Navigate through each tab page via uni.switchTab()
  for (const tab of TAB_PAGES) {
    console.log(`[scraper] Switching to: ${tab.label} (${tab.route})`);
    const result = await page.evaluate((route) => {
      return new Promise(resolve => {
        if (typeof uni !== 'undefined' && uni.switchTab) {
          uni.switchTab({
            url: route,
            success: () => resolve('ok'),
            fail: (e) => resolve('fail:' + JSON.stringify(e)),
          });
        } else {
          resolve('no-uni');
        }
      });
    }, tab.route);

    if (result !== 'ok') {
      console.log(`[scraper]   switchTab failed: ${result}, skipping`);
      continue;
    }

    // Wait for page render + network activity
    await page.waitForTimeout(3000);
    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch (e) { /* timeout ok */ }
    await page.waitForTimeout(1000);

    // Dismiss any modal dialogs
    await dismissDialogs(page);

    // Scroll to trigger lazy loading
    await scrollFullPage(page);

    const shotPath = path.join(screenshotDir, `original_${tab.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: true });
    pages.push({ name: tab.name, screenshot: shotPath });
    console.log(`[scraper]   Captured: ${tab.name}`);
  }

  // Get final HTML (includes all loaded components from all tabs)
  const html = await page.content();
  console.log(`[scraper] Got HTML: ${html.length} chars`);
  console.log(`[scraper] Collected ${resources.length} resources across ${pages.length} pages`);

  await browser.close();
  return { html, resources, pages };
}

async function scrollFullPage(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += 300) {
      window.scrollTo(0, y);
      await delay(150);
    }
    window.scrollTo(0, 0);
    await delay(300);
  });
  await page.waitForTimeout(500);
}

async function dismissDialogs(page) {
  try {
    const cancelBtn = await page.$('.uni-modal__btn_default');
    if (cancelBtn) {
      const box = await cancelBtn.boundingBox();
      if (box) {
        await cancelBtn.click({ force: true });
        await page.waitForTimeout(500);
      }
    }
  } catch (e) { /* no dialog */ }
}

module.exports = { scrape, VIEWPORT, MOBILE_UA, TAB_PAGES };
