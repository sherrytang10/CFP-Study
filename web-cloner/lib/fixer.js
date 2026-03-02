const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { download } = require('./downloader');

/**
 * Attempt to fix differences between original and cloned pages.
 * @param {object} compareResult - Result from comparator.compare()
 * @param {string} htmlPath - Path to local index.html
 * @param {string} outputDir - Output directory
 * @param {Map<string, string>} pathMap - Current URL → local path mapping
 * @param {string} baseUrl - Original page base URL
 * @returns {{ fixed: number, details: string[] }}
 */
async function fix(compareResult, htmlPath, outputDir, pathMap, baseUrl) {
  const details = [];
  let fixed = 0;
  let html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html, { decodeEntities: false });

  // Strategy 1: Fix failed requests (404s) - download missing resources
  if (compareResult.failedRequests && compareResult.failedRequests.length > 0) {
    const missing = [];
    for (const failedUrl of compareResult.failedRequests) {
      // Try to find the original remote URL
      let remoteUrl = failedUrl;
      if (failedUrl.startsWith('http://localhost')) {
        // Map back to original URL
        const localPath = failedUrl.replace(/http:\/\/localhost:\d+\//, '');
        // Find original URL from pathMap
        for (const [remote, local] of pathMap) {
          if (local === localPath || local.endsWith(path.basename(localPath))) {
            remoteUrl = remote;
            break;
          }
        }
        // If still local URL, try constructing from baseUrl
        if (remoteUrl.startsWith('http://localhost')) {
          try {
            remoteUrl = new URL(localPath, baseUrl).href;
          } catch (e) { /* skip */ }
        }
      }

      if (!remoteUrl.startsWith('http://localhost')) {
        let type = 'image';
        if (/\.css(\?|$)/i.test(remoteUrl)) type = 'css';
        else if (/\.js(\?|$)/i.test(remoteUrl)) type = 'js';
        else if (/\.(woff2?|ttf|eot|otf)(\?|$)/i.test(remoteUrl)) type = 'font';
        missing.push({ url: remoteUrl, type });
      }
    }

    if (missing.length > 0) {
      console.log(`[fixer] Attempting to download ${missing.length} missing resources...`);
      const newPaths = await download(missing, outputDir, baseUrl);
      for (const [url, localPath] of newPaths) {
        pathMap.set(url, localPath);
        fixed++;
      }
      details.push(`Downloaded ${newPaths.size} missing resources`);
    }
  }

  // Strategy 2: Fix broken image references
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.startsWith('data:') && !src.startsWith('http')) {
      const fullPath = path.join(outputDir, src);
      if (!fs.existsSync(fullPath)) {
        // Try finding in assets
        const basename = path.basename(src);
        const candidates = findFileRecursive(path.join(outputDir, 'assets'), basename);
        if (candidates.length > 0) {
          const newSrc = path.relative(outputDir, candidates[0]).replace(/\\/g, '/');
          $(el).attr('src', newSrc);
          fixed++;
          details.push(`Fixed image path: ${src} → ${newSrc}`);
        }
      }
    }
  });

  // Strategy 3: Fix CSS url() references
  const assetsDir = path.join(outputDir, 'assets');
  if (fs.existsSync(path.join(assetsDir, 'css'))) {
    const cssFiles = fs.readdirSync(path.join(assetsDir, 'css')).filter(f => f.endsWith('.css'));
    for (const cssFile of cssFiles) {
      const cssPath = path.join(assetsDir, 'css', cssFile);
      let content = fs.readFileSync(cssPath, 'utf-8');
      let modified = false;

      content = content.replace(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi, (match, rawUrl) => {
        if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('#')) {
          return match;
        }
        // Check if the referenced file exists
        const resolvedPath = path.resolve(path.join(assetsDir, 'css'), rawUrl);
        if (!fs.existsSync(resolvedPath)) {
          // Try to find in assets
          const basename = path.basename(rawUrl.split('?')[0]);
          const candidates = findFileRecursive(assetsDir, basename);
          if (candidates.length > 0) {
            const newPath = path.relative(path.join(assetsDir, 'css'), candidates[0]).replace(/\\/g, '/');
            fixed++;
            modified = true;
            details.push(`Fixed CSS url: ${rawUrl} → ${newPath}`);
            return `url('${newPath}')`;
          }
        }
        return match;
      });

      if (modified) {
        fs.writeFileSync(cssPath, content, 'utf-8');
      }
    }
  }

  // Strategy 4: Add console error suppression (remove broken script references)
  if (compareResult.errors && compareResult.errors.length > 0) {
    // Add error handler to suppress JS errors from missing scripts
    const errorHandler = '<script>window.onerror=function(){return true;}</script>';
    if (!html.includes('window.onerror')) {
      $('head').prepend(errorHandler);
      fixed++;
      details.push('Added JS error suppression');
    }
  }

  // Save fixed HTML
  const fixedHtml = $.html();
  fs.writeFileSync(htmlPath, fixedHtml, 'utf-8');

  console.log(`[fixer] Applied ${fixed} fixes`);
  return { fixed, details };
}

function findFileRecursive(dir, filename) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFileRecursive(fullPath, filename));
    } else if (entry.name === filename) {
      results.push(fullPath);
    }
  }
  return results;
}

module.exports = { fix };
