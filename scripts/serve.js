#!/usr/bin/env node
/**
 * scripts/serve.js
 * Zero-dependency native Node.js HTTP dev server.
 * Serves the Dark Mode web dashboard for 'npm run dev'.
 * Auto-detects port conflicts (EADDRINUSE) and increments port automatically.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let currentPort = parseInt(process.env.PORT, 10) || 3000;
const MAX_PORT_ATTEMPTS = 20;
let attempts = 0;
const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(ROOT, reqPath);

  // Security check: ensure path is within ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1><p>The requested file does not exist.</p>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    attempts++;
    if (attempts < MAX_PORT_ATTEMPTS) {
      console.log('\x1b[33m%s\x1b[0m', `⚠ Port ${currentPort} is currently occupied. Auto-switching to port ${currentPort + 1}...`);
      currentPort++;
      setTimeout(() => {
        startServer(currentPort);
      }, 150);
      return;
    }
    console.error(`\x1b[31mError: Could not find an open port after ${MAX_PORT_ATTEMPTS} attempts.\x1b[0m`);
    process.exit(1);
  } else {
    console.error('\x1b[31mServer error:\x1b[0m', err.message);
    process.exit(1);
  }
});

function startServer(port) {
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('\x1b[36m%s\x1b[0m', '=============================================================');
    console.log('\x1b[36m%s\x1b[0m', '  ⚡ MotorGuard AI: Dark Mode Predictive Maintenance UI     ');
    console.log('\x1b[36m%s\x1b[0m', '  🌐 Ready for GitHub Pages & Local Development              ');
    console.log('\x1b[36m%s\x1b[0m', '=============================================================');
    console.log('\x1b[32m%s\x1b[0m', `✓ Server live at: ${url}`);
    if (port !== 3000) {
      console.log('\x1b[33m%s\x1b[0m', `ℹ (Port 3000 was in use by another app, auto-assigned to ${port})`);
    }
    console.log('\x1b[90m%s\x1b[0m', 'Press Ctrl+C in this terminal to stop the server.\n');

    // Open browser automatically
    const startCmd = process.platform === 'win32' ? `start ${url}` : (process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`);
    exec(startCmd, () => {});
  });
}

startServer(currentPort);
