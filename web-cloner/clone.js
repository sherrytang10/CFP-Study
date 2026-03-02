#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { scrape } = require('./lib/scraper');
const { download } = require('./lib/downloader');
const { rewrite } = require('./lib/rewriter');
const { start, stop } = require('./lib/server');
const { compare } = require('./lib/comparator');
const { fix } = require('./lib/fixer');

const MAX_FIX_ROUNDS = 3;
const DIFF_THRESHOLD = 5; // percent

async function clone(url) {
  const startTime = Date.now();
  const outputDir = path.resolve(__dirname, 'output');
  const screenshotDir = path.join(outputDir, 'screenshots');
  const htmlPath = path.join(outputDir, 'index.html');

  // Clean output dir
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(screenshotDir, { recursive: true });

  console.log(`\n=== Web Cloner (Multi-Page SPA) ===`);
  console.log(`Target: ${url}\n`);

  // Step 1: Scrape — render SPA, switchTab through all pages, collect resources
  console.log('[1/6] Rendering SPA with Playwright (mobile 375x812)...');
  console.log('      Navigating: entry → 首页 → 点餐 → 订单 → 我的');
  const { html, resources, pages: scrapedPages } = await scrape(url, screenshotDir);
  const pageNames = scrapedPages.map(p => p.name);
  console.log(`      Captured ${pageNames.length} pages: ${pageNames.join(', ')}`);

  // Step 2: Download assets
  console.log(`\n[2/6] Downloading ${resources.length} assets...`);
  const pathMap = await download(resources, outputDir, url);

  // Step 3: Rewrite paths
  console.log('\n[3/6] Rewriting resource paths...');
  const rewrittenHtml = rewrite(html, pathMap, outputDir);
  fs.writeFileSync(htmlPath, rewrittenHtml, 'utf-8');
  console.log(`[rewriter] Saved: ${htmlPath}`);

  // Step 4: Start local server
  console.log('\n[4/6] Starting local server...');
  const localUrl = await start(outputDir);

  // Step 5: Compare — full-page screenshot of each page, original vs cloned
  console.log('\n[5/6] Comparing screenshots (all pages)...');
  let result = await compare(url, localUrl, screenshotDir, pageNames);
  printResult(result);

  // Step 6: Fix loop
  if (!result.overallMatch) {
    for (let round = 1; round <= MAX_FIX_ROUNDS; round++) {
      console.log(`\n[6/6] Auto-fixing (round ${round}/${MAX_FIX_ROUNDS})...`);
      const { fixed, details } = await fix(result, htmlPath, outputDir, pathMap, url);
      if (fixed === 0) {
        console.log('      No more fixes available, stopping.');
        break;
      }
      console.log(`      Applied ${fixed} fixes: ${details.join(', ')}`);

      // Delete old cloned screenshots for re-capture
      for (const name of pageNames) {
        const clonedPng = path.join(screenshotDir, `cloned_${name}.png`);
        if (fs.existsSync(clonedPng)) fs.unlinkSync(clonedPng);
      }

      console.log('      Re-comparing...');
      result = await compare(url, localUrl, screenshotDir, pageNames);
      printResult(result);

      if (result.overallMatch) break;
    }
  }

  // Stop server
  await stop();

  // Final report
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Final Results ===');
  console.log(`Overall: ${result.overallMatch ? 'MATCH' : 'MISMATCH'} (${result.overallDiffPercent}% avg diff)`);
  for (const p of result.pages) {
    console.log(`  ${p.name.padEnd(10)} ${p.diffPercent}% ${p.match ? '✓' : '✗'}`);
  }
  console.log(`\nCloned page: ${htmlPath}`);
  console.log(`Screenshots: ${screenshotDir}/`);
  console.log(`Time: ${elapsed}s\n`);

  return result;
}

function printResult(result) {
  for (const p of result.pages) {
    const status = p.match ? '✓' : `✗ (>${DIFF_THRESHOLD}%)`;
    console.log(`      ${p.name.padEnd(10)} ${p.diffPercent}% ${status}`);
  }
  console.log(`      ${'overall'.padEnd(10)} ${result.overallDiffPercent}% ${result.overallMatch ? '✓' : '✗'}`);
}

// CLI
const url = process.argv[2];
if (!url) {
  console.error('Usage: node clone.js <URL>');
  process.exit(1);
}

clone(url).then((result) => {
  process.exit(result.overallMatch ? 0 : 1);
}).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(2);
});
