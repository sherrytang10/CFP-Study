const express = require('express');
const path = require('path');

let serverInstance = null;

/**
 * Start a local HTTP server to serve the cloned page.
 * @param {string} outputDir - Directory containing index.html and assets
 * @param {number} port - Port number (default 3000)
 * @returns {Promise<string>} Local URL
 */
function start(outputDir, port = 3000) {
  return new Promise((resolve, reject) => {
    const app = express();

    // CORS headers for fonts
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      next();
    });

    // Serve static files
    app.use(express.static(outputDir));

    // Fallback to index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(outputDir, 'index.html'));
    });

    serverInstance = app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`[server] Serving cloned page at ${url}`);
      resolve(url);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Try next port
        start(outputDir, port + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Stop the local server.
 */
function stop() {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        console.log('[server] Stopped');
        serverInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = { start, stop };
