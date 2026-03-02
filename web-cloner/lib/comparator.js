const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const { VIEWPORT, MOBILE_UA, TAB_PAGES } = require('./scraper');

/**
 * Compare original vs cloned pages via full-page screenshot diff.
 * For original: navigates entry page then uni.switchTab() through all tabs.
 * For cloned: same navigation flow on local server.
 * @param {string} originalUrl - Original page URL
 * @param {string} localUrl - Local cloned page URL
 * @param {string} screenshotDir - Directory for screenshots
 * @param {string[]} pageNames - Page names to compare (e.g. ['entry','home','menu','orders','profile'])
 * @returns {{ pages: Array, overallMatch: boolean, overallDiffPercent: number, errors: string[], failedRequests: string[] }}
 */
async function compare(originalUrl, localUrl, screenshotDir, pageNames) {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // --- Original screenshots (skip if already exist from scraper) ---
  const firstOriginal = path.join(screenshotDir, `original_${pageNames[0]}.png`);
  if (!fs.existsSync(firstOriginal)) {
    console.log('[comparator] Taking original screenshots...');
    await screenshotAllPages(browser, originalUrl, screenshotDir, 'original', pageNames);
  }

  // --- Cloned screenshots (always re-take) ---
  console.log('[comparator] Taking cloned screenshots...');
  const { errors, failedRequests } = await screenshotAllPages(browser, localUrl, screenshotDir, 'cloned', pageNames);

  await browser.close();

  // --- Pixel comparison per page ---
  const pageResults = [];
  let totalDiffPixels = 0;
  let totalPixels = 0;

  for (const name of pageNames) {
    const origPath = path.join(screenshotDir, `original_${name}.png`);
    const clonePath = path.join(screenshotDir, `cloned_${name}.png`);

    if (!fs.existsSync(origPath) || !fs.existsSync(clonePath)) {
      console.log(`[comparator] ${name}: SKIP (missing screenshot)`);
      pageResults.push({ name, match: false, diffPercent: 100 });
      continue;
    }

    const img1 = PNG.sync.read(fs.readFileSync(origPath));
    const img2 = PNG.sync.read(fs.readFileSync(clonePath));

    const width = Math.min(img1.width, img2.width);
    const height = Math.min(img1.height, img2.height);
    const cropped1 = cropPng(img1, width, height);
    const cropped2 = cropPng(img2, width, height);

    const diff = new PNG({ width, height });
    const diffPixels = pixelmatch(
      cropped1.data, cropped2.data, diff.data,
      width, height,
      { threshold: 0.1 }
    );

    const pixels = width * height;
    const diffPercent = parseFloat(((diffPixels / pixels) * 100).toFixed(2));
    const match = diffPercent < 5;

    const diffPath = path.join(screenshotDir, `diff_${name}.png`);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));

    console.log(`[comparator] ${name}: ${diffPercent}% diff (${diffPixels}/${pixels} px) ${match ? '✓' : '✗'}`);
    pageResults.push({ name, match, diffPercent, diffPixels });

    totalDiffPixels += diffPixels;
    totalPixels += pixels;
  }

  const overallDiffPercent = totalPixels > 0 ? parseFloat(((totalDiffPixels / totalPixels) * 100).toFixed(2)) : 100;
  const overallMatch = pageResults.every(p => p.match);

  if (errors.length > 0) console.log(`[comparator] Console errors: ${errors.length}`);
  if (failedRequests.length > 0) {
    console.log(`[comparator] Failed requests: ${failedRequests.length}`);
    failedRequests.slice(0, 10).forEach(u => console.log(`  - ${u}`));
  }

  return { pages: pageResults, overallMatch, overallDiffPercent, errors, failedRequests };
}

/**
 * Navigate through all pages and take screenshots.
 * For the 'entry' page: just screenshot the current URL.
 * For tab pages: use uni.switchTab().
 */
async function screenshotAllPages(browser, url, screenshotDir, prefix, pageNames) {
  const errors = [];
  const failedRequests = [];

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    userAgent: MOBILE_UA,
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  if (prefix === 'cloned') {
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('requestfailed', (req) => {
      failedRequests.push(req.url());
    });
  }

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log(`[comparator] ${prefix} load warning: ${e.message}`);
  }
  await page.waitForTimeout(3000);

  for (const name of pageNames) {
    if (name === 'entry') {
      // Entry page = current page after goto
      await scrollFullPage(page);
      const shotPath = path.join(screenshotDir, `${prefix}_entry.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
    } else {
      // Tab page — use uni.switchTab
      const tab = TAB_PAGES.find(t => t.name === name);
      if (!tab) continue;

      const result = await page.evaluate((route) => {
        return new Promise(resolve => {
          if (typeof uni !== 'undefined' && uni.switchTab) {
            uni.switchTab({
              url: route,
              success: () => resolve('ok'),
              fail: (e) => resolve('fail'),
            });
          } else {
            resolve('no-uni');
          }
        });
      }, tab.route);

      if (result !== 'ok') continue;

      await page.waitForTimeout(3000);
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (e) { /* ok */ }
      await page.waitForTimeout(1000);
      await dismissDialogs(page);
      await scrollFullPage(page);

      const shotPath = path.join(screenshotDir, `${prefix}_${name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
    }
  }

  await ctx.close();
  return { errors, failedRequests };
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
      await cancelBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }
  } catch (e) { /* no dialog */ }
}

function cropPng(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const cropped = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (png.width * y + x) << 2;
      const dstIdx = (width * y + x) << 2;
      cropped.data[dstIdx] = png.data[srcIdx];
      cropped.data[dstIdx + 1] = png.data[srcIdx + 1];
      cropped.data[dstIdx + 2] = png.data[srcIdx + 2];
      cropped.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }
  return cropped;
}

module.exports = { compare };
