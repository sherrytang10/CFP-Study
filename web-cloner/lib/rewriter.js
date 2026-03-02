const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * Rewrite all resource paths in HTML and CSS files from absolute to local relative.
 * @param {string} html - Original rendered HTML
 * @param {Map<string, string>} pathMap - Map of remote URL → local relative path
 * @param {string} outputDir - Output directory
 * @returns {string} Rewritten HTML
 */
function rewrite(html, pathMap, outputDir) {
  const $ = cheerio.load(html, { decodeEntities: false });

  let rewriteCount = 0;

  // Helper: try to match a URL against pathMap
  function rewriteUrl(originalUrl) {
    if (!originalUrl) return null;
    // Direct match
    if (pathMap.has(originalUrl)) {
      rewriteCount++;
      return pathMap.get(originalUrl);
    }
    // Try without query string
    const noQuery = originalUrl.split('?')[0];
    if (pathMap.has(noQuery)) {
      rewriteCount++;
      return pathMap.get(noQuery);
    }
    // Try matching by pathname
    for (const [remote, local] of pathMap) {
      try {
        const remoteUrl = new URL(remote);
        const origUrl = new URL(originalUrl, 'https://dummy.com');
        if (remoteUrl.pathname === origUrl.pathname) {
          rewriteCount++;
          return local;
        }
      } catch (e) { /* skip */ }
    }
    return null;
  }

  // Rewrite <link> stylesheets
  $('link[href]').each((_, el) => {
    const href = $(el).attr('href');
    const newPath = rewriteUrl(href);
    if (newPath) $(el).attr('href', newPath);
  });

  // Rewrite <script src>
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    const newPath = rewriteUrl(src);
    if (newPath) $(el).attr('src', newPath);
  });

  // Rewrite <img src> and <img srcset>
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    const newPath = rewriteUrl(src);
    if (newPath) $(el).attr('src', newPath);
  });

  // Rewrite background-image in style attributes
  $('[style]').each((_, el) => {
    let style = $(el).attr('style');
    if (style && style.includes('url(')) {
      style = rewriteCssUrls(style, pathMap, () => rewriteCount++);
      $(el).attr('style', style);
    }
  });

  // Rewrite <source src>
  $('source[src]').each((_, el) => {
    const src = $(el).attr('src');
    const newPath = rewriteUrl(src);
    if (newPath) $(el).attr('src', newPath);
  });

  // Rewrite <video poster> and <video src>
  $('video[poster]').each((_, el) => {
    const poster = $(el).attr('poster');
    const newPath = rewriteUrl(poster);
    if (newPath) $(el).attr('poster', newPath);
  });

  const rewrittenHtml = $.html();
  console.log(`[rewriter] Rewrote ${rewriteCount} resource references in HTML`);

  // Rewrite CSS files
  const assetsDir = path.join(outputDir, 'assets', 'css');
  if (fs.existsSync(assetsDir)) {
    const cssFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.css'));
    for (const cssFile of cssFiles) {
      const cssPath = path.join(assetsDir, cssFile);
      let cssContent = fs.readFileSync(cssPath, 'utf-8');
      const original = cssContent;
      cssContent = rewriteCssUrls(cssContent, pathMap, () => {});
      if (cssContent !== original) {
        // Fix relative paths: CSS is in assets/css/, so images are at ../images/
        for (const [, localPath] of pathMap) {
          if (localPath.startsWith('assets/images/') || localPath.startsWith('assets/fonts/')) {
            const filename = path.basename(localPath);
            // Replace assets/images/x.png with ../images/x.png (relative to css dir)
            cssContent = cssContent.replace(
              new RegExp(escapeRegex(localPath), 'g'),
              '../' + localPath.replace('assets/', '')
            );
          }
        }
        fs.writeFileSync(cssPath, cssContent, 'utf-8');
      }
    }
  }

  return rewrittenHtml;
}

function rewriteCssUrls(content, pathMap, onRewrite) {
  return content.replace(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi, (match, rawUrl) => {
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:') || rawUrl.startsWith('#')) {
      return match;
    }
    for (const [remote, local] of pathMap) {
      try {
        if (remote.includes(rawUrl) || rawUrl.includes(new URL(remote).pathname)) {
          onRewrite();
          return `url('${local}')`;
        }
      } catch (e) { /* skip */ }
    }
    return match;
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { rewrite };
