const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Download all resources to local directory.
 * @param {Array<{url: string, type: string}>} resources
 * @param {string} outputDir - Base output directory
 * @param {string} baseUrl - Original page URL for resolving relative paths
 * @returns {Map<string, string>} Map of remote URL → local relative path
 */
async function download(resources, outputDir, baseUrl) {
  const pathMap = new Map();
  const assetsDir = path.join(outputDir, 'assets');

  // Create subdirs
  for (const dir of ['css', 'js', 'images', 'fonts']) {
    fs.mkdirSync(path.join(assetsDir, dir), { recursive: true });
  }

  // Deduplicate
  const unique = [];
  const seen = new Set();
  for (const r of resources) {
    if (!seen.has(r.url)) {
      seen.add(r.url);
      unique.push(r);
    }
  }

  console.log(`[downloader] Downloading ${unique.length} assets...`);

  // Download with concurrency limit
  const CONCURRENCY = 5;
  let index = 0;
  let completed = 0;
  const cssFiles = [];

  async function worker() {
    while (index < unique.length) {
      const i = index++;
      const resource = unique[i];
      try {
        const localPath = await downloadOne(resource, assetsDir, baseUrl);
        if (localPath) {
          const relativePath = 'assets/' + path.relative(assetsDir, localPath).replace(/\\/g, '/');
          pathMap.set(resource.url, relativePath);
          if (resource.type === 'css') {
            cssFiles.push({ localPath, remoteUrl: resource.url });
          }
        }
      } catch (e) {
        // Silently skip failed downloads
      }
      completed++;
      if (completed % 10 === 0 || completed === unique.length) {
        console.log(`[downloader] ${completed}/${unique.length} done`);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, unique.length); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  // Parse CSS files for additional url() references
  for (const { localPath, remoteUrl } of cssFiles) {
    try {
      const cssContent = fs.readFileSync(localPath, 'utf-8');
      const extraResources = extractCssUrls(cssContent, remoteUrl);
      if (extraResources.length > 0) {
        console.log(`[downloader] Found ${extraResources.length} extra resources in CSS`);
        for (const extra of extraResources) {
          if (!pathMap.has(extra.url)) {
            try {
              const localExtraPath = await downloadOne(extra, assetsDir, baseUrl);
              if (localExtraPath) {
                const relativePath = 'assets/' + path.relative(assetsDir, localExtraPath).replace(/\\/g, '/');
                pathMap.set(extra.url, relativePath);
              }
            } catch (e) { /* skip */ }
          }
        }
      }
    } catch (e) { /* skip */ }
  }

  console.log(`[downloader] Downloaded ${pathMap.size} assets total`);
  return pathMap;
}

function extractCssUrls(cssContent, cssFileUrl) {
  const resources = [];
  const urlRegex = /url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi;
  let match;
  while ((match = urlRegex.exec(cssContent)) !== null) {
    let rawUrl = match[1].trim();
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('#')) continue;
    try {
      const absUrl = new URL(rawUrl, cssFileUrl).href;
      let type = 'image';
      if (/\.(woff2?|ttf|eot|otf)(\?|$)/i.test(rawUrl)) type = 'font';
      resources.push({ url: absUrl, type });
    } catch (e) { /* skip invalid URLs */ }
  }
  return resources;
}

function downloadOne(resource, assetsDir, baseUrl) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(resource.url, baseUrl);
    } catch (e) {
      return reject(new Error(`Invalid URL: ${resource.url}`));
    }

    // Skip data: and blob: URLs
    if (url.protocol === 'data:' || url.protocol === 'blob:') {
      return resolve(null);
    }

    // Determine local filename
    let pathname = url.pathname;
    let filename = path.basename(pathname) || 'index';
    // Remove query string from filename
    filename = filename.split('?')[0];
    // Add extension if missing
    if (!path.extname(filename)) {
      const extMap = { css: '.css', js: '.js', image: '.png', font: '.woff2' };
      filename += extMap[resource.type] || '';
    }
    // Avoid name collisions with hash
    const hash = simpleHash(resource.url);
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    filename = `${base}_${hash}${ext}`;

    const typeDir = {
      css: 'css', js: 'js', image: 'images', font: 'fonts',
    }[resource.type] || 'other';

    const localPath = path.join(assetsDir, typeDir, filename);

    const client = url.protocol === 'https:' ? https : http;
    const req = client.get(url.href, { timeout: 10000 }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url.href).href;
        downloadOne({ ...resource, url: redirectUrl }, assetsDir, baseUrl)
          .then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url.href}`));
      }
      const ws = fs.createWriteStream(localPath);
      res.pipe(ws);
      ws.on('finish', () => resolve(localPath));
      ws.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}

module.exports = { download };
