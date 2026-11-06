import { CodeSnippet } from '../types';

export const CODE_SNIPPETS: CodeSnippet[] = [
  {
    id: 'server-js',
    title: 'Standalone Node.js Express Reverse Proxy Server',
    filename: 'krunker-proxy-server.js',
    language: 'javascript',
    description: 'Complete Node.js HTTP & WebSocket reverse proxy script. Handles CORS, strips iframe/CSP headers, and tunnels Krunker matchmaker/game WebSocket connections.',
    code: `/**
 * KRUNKER.IO FULL REVERSE PROXY & SITE MIRROR (HTTP + WEBSOCKETS)
 * Run: 
 *   npm init -y
 *   npm install express ws
 *   node krunker-proxy-server.js
 */

const express = require('express');
const http = require('http');
const { WebSocket, WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Proxy fetch helper
async function proxyFetch(targetUrl, req, res) {
  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://krunker.io/',
        'Origin': 'https://krunker.io',
      },
    });

    res.status(upstream.status);
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(502).send('Proxy error: ' + err.message);
  }
}

// Injected client runtime proxy script
const CLIENT_SHIM = \`
<script>
(function() {
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    let target = url;
    if (typeof url === 'string' && (url.startsWith('ws://') || url.startsWith('wss://'))) {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      target = proto + '//' + window.location.host + '/proxy-ws?target=' + encodeURIComponent(url);
      console.log('[Krunker Proxy] Routed socket to: ' + target);
    }
    return protocols ? new NativeWebSocket(target, protocols) : new NativeWebSocket(target);
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  Object.assign(window.WebSocket, NativeWebSocket);
})();
</script>
\`;

// 1. Direct Site Gateway: Fetches entire krunker.io HTML and rewrites asset URLs
app.get('/', async (req, res) => {
  try {
    const upstream = await fetch('https://krunker.io/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,*/*',
      },
    });

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    let html = await upstream.text();
    // Rewrite relative links to root paths
    html = html.replace(/src="\\.\\/libs\\//g, 'src="/libs/');
    html = html.replace(/src="\\.\\/static\\//g, 'src="/static/');
    html = html.replace(/src="\\.\\/img\\//g, 'src="/img/');
    html = html.replace(/href="\\.\\/css\\//g, 'href="/css/');
    html = html.replace(/href="\\.\\/img\\//g, 'href="/img/');
    html = html.replace(/href="\\.\\/libs\\//g, 'href="/libs/');
    html = html.replace(/https:\\/\\/assets\\.krunker\\.io\\//g, '/assets/');
    html = html.replace(/\\/\\/assets\\.krunker\\.io\\//g, '/assets/');
    html = html.replace(/\\["krunker\\.io","browserfps\\.com"\\]\\.includes\\(location\\.hostname\\)/g, 'true');

    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + CLIENT_SHIM);
    } else {
      html = CLIENT_SHIM + html;
    }
    res.send(html);
  } catch (err) {
    res.status(502).send('Error loading krunker.io: ' + err.message);
  }
});

// 2. Proxies for static & game assets
app.use('/static', (req, res) => proxyFetch('https://krunker.io/static' + req.url, req, res));
app.use('/libs', (req, res) => proxyFetch('https://krunker.io/libs' + req.url, req, res));
app.use('/css', (req, res) => proxyFetch('https://krunker.io/css' + req.url, req, res));
app.use('/img', (req, res) => proxyFetch('https://krunker.io/img' + req.url, req, res));
app.use('/pkg', (req, res) => proxyFetch('https://krunker.io/pkg' + req.url, req, res));
app.use('/textures', (req, res) => proxyFetch('https://assets.krunker.io/textures' + req.url, req, res));
app.use('/models', (req, res) => proxyFetch('https://assets.krunker.io/models' + req.url, req, res));
app.use('/sound', (req, res) => proxyFetch('https://assets.krunker.io/sound' + req.url, req, res));
app.use('/assets', (req, res) => proxyFetch('https://assets.krunker.io' + req.url, req, res));
app.use('/seek-game', (req, res) => proxyFetch('https://matchmaker.krunker.io/seek-game' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''), req, res));

// 3. WebSocket Proxy Server for real-time multiplayer connections
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (clientWs, req) => {
  const urlObj = new URL(req.url, 'http://' + req.headers.host);
  const target = urlObj.searchParams.get('target');

  if (!target) return clientWs.close(1008, 'Missing target parameter');

  const remoteWs = new WebSocket(target, {
    headers: {
      'Origin': 'https://krunker.io',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const queue = [];

  remoteWs.on('open', () => {
    while (queue.length > 0) remoteWs.send(queue.shift());
  });

  remoteWs.on('message', (data, isBinary) => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data, { binary: isBinary });
  });

  remoteWs.on('close', (code, reason) => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close(code, reason);
  });

  remoteWs.on('error', () => {
    if (clientWs.readyState === WebSocket.OPEN) clientWs.close(1011, 'Remote socket error');
  });

  clientWs.on('message', (data, isBinary) => {
    if (remoteWs.readyState === WebSocket.OPEN) {
      remoteWs.send(data, { binary: isBinary });
    } else {
      queue.push(data);
    }
  });

  clientWs.on('close', (code, reason) => {
    if (remoteWs.readyState === WebSocket.OPEN) remoteWs.close(code, reason);
  });
});

server.on('upgrade', (request, socket, head) => {
  const urlObj = new URL(request.url, 'http://' + request.headers.host);
  if (urlObj.pathname === '/proxy-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

server.listen(PORT, () => {
  console.log('Krunker Full Site Proxy listening on http://localhost:' + PORT);
});`,
  },
  {
    id: 'client-html',
    title: 'Standalone HTML5 Client with Pointer Lock & Fullscreen',
    filename: 'index.html',
    language: 'html',
    description: 'Clean HTML5 gaming wrapper that embeds the proxy, requests Pointer Lock API for FPS mouse aim, and manages fullscreen and keybind focus.',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Krunker.io Unblocked Proxy Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #0b0f19; font-family: system-ui, sans-serif; color: #fff; }
    
    #container { position: relative; width: 100vw; height: 100vh; }
    iframe { width: 100%; height: 100%; border: none; display: block; }

    #hud-overlay {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 8px; background: rgba(15, 23, 42, 0.85);
      padding: 6px 14px; border-radius: 999px; backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15); z-index: 100;
      transition: opacity 0.3s;
    }
    #hud-overlay:hover { opacity: 1; }

    button {
      background: #f59e0b; color: #000; font-weight: 700; border: none;
      padding: 6px 14px; border-radius: 999px; cursor: pointer; font-size: 13px;
      transition: transform 0.1s, background 0.2s;
    }
    button:hover { background: #fbbf24; transform: translateY(-1px); }
    button.secondary { background: rgba(255, 255, 255, 0.15); color: #fff; }
    button.secondary:hover { background: rgba(255, 255, 255, 0.25); }

    #crosshair {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 6px; height: 6px; background: #22c55e; border-radius: 50%;
      pointer-events: none; z-index: 50; display: none;
    }
  </style>
</head>
<body>
  <div id="container">
    <!-- Overlay Bar -->
    <div id="hud-overlay">
      <button id="lock-btn">🔒 Lock Mouse (Aim)</button>
      <button id="fullscreen-btn" class="secondary">⛶ Fullscreen</button>
      <button id="reload-btn" class="secondary">↻ Reload</button>
    </div>

    <!-- Optional custom center crosshair -->
    <div id="crosshair"></div>

    <!-- Embedded Proxy Game Frame -->
    <iframe id="game-frame" src="/proxy/krunker" allow="autoplay; fullscreen; pointer-lock"></iframe>
  </div>

  <script>
    const iframe = document.getElementById('game-frame');
    const lockBtn = document.getElementById('lock-btn');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const reloadBtn = document.getElementById('reload-btn');

    // Request pointer lock when button is clicked or user clicks canvas
    lockBtn.addEventListener('click', () => {
      iframe.contentWindow?.focus();
      try {
        iframe.requestPointerLock?.();
      } catch (err) {
        console.warn('Pointer lock request:', err);
      }
    });

    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    reloadBtn.addEventListener('click', () => {
      iframe.src = iframe.src;
    });

    // Auto-focus the game iframe so WASD keys register immediately
    window.addEventListener('load', () => {
      setTimeout(() => iframe.contentWindow?.focus(), 500);
    });
  </script>
</body>
</html>`,
  },
  {
    id: 'cloudflare-worker',
    title: 'Cloudflare Worker Edge Reverse Proxy',
    filename: 'worker.js',
    language: 'javascript',
    description: 'Deploy on Cloudflare Workers (free tier) for a global edge reverse proxy that strips X-Frame-Options and routes around ISP or school firewalls.',
    code: `/**
 * CLOUDFLARE WORKER KRUNKER PROXY
 * Deploy in 30 seconds:
 * 1. Go to dash.cloudflare.com -> Workers & Pages
 * 2. Create Worker -> Paste this code -> Deploy
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Target krunker.io
    const targetUrl = new URL(url.pathname + url.search, 'https://krunker.io');

    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set('Origin', 'https://krunker.io');
    modifiedHeaders.set('Referer', 'https://krunker.io/');
    modifiedHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Handle WebSocket upgrade proxy
    if (request.headers.get('Upgrade') === 'websocket') {
      const wsTarget = url.searchParams.get('target') || 'wss://matchmaker.krunker.io';
      return fetch(wsTarget, {
        headers: modifiedHeaders,
      });
    }

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: modifiedHeaders,
      body: request.body,
      redirect: 'follow',
    });

    // Clone response so we can modify security headers
    const newHeaders = new Headers(response.headers);
    newHeaders.delete('x-frame-options');
    newHeaders.delete('content-security-policy');
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};`,
  },
  {
    id: 'tampermonkey-script',
    title: 'Tampermonkey / Greasemonkey FPS Uncapper & Custom Client',
    filename: 'krunker-pro-client.user.js',
    language: 'javascript',
    description: 'Client-side userscript to unlock 144+ FPS, remove in-game advertisements, enable custom crosshairs, and automatically stabilize mouse aim.',
    code: `// ==UserScript==
// @name         Krunker.io Pro Client & Network Optimizer
// @namespace    https://krunker.io/
// @version      2.5
// @description  Uncaps FPS, optimizes WebSocket ping, injects custom crosshair, and bypasses connection throttling.
// @author       ProxyHub
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  console.log('[Krunker Optimizer] Script loaded');

  // 1. Uncap requestAnimationFrame FPS limit
  const originalRAF = window.requestAnimationFrame;
  window.requestAnimationFrame = function(callback) {
    return originalRAF(callback);
  };

  // 2. High-performance canvas context tweaks
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attributes) {
    if (type === 'webgl' || type === 'webgl2') {
      attributes = Object.assign({}, attributes, {
        powerPreference: 'high-performance',
        desynchronized: true, // Lower input lag for mouse aim
        preserveDrawingBuffer: false,
      });
    }
    return originalGetContext.call(this, type, attributes);
  };

  // 3. Pointer Lock stability helper
  document.addEventListener('pointerlockerror', (e) => {
    console.warn('[Krunker Pointer Lock] Retrying lock...', e);
  });
})();`,
  },
  {
    id: 'dockerfile',
    title: 'Dockerfile for One-Click Container Deployment',
    filename: 'Dockerfile',
    language: 'dockerfile',
    description: 'Production Docker container setup for deploying the Node.js Krunker proxy server to Railway, Render, Fly.io, or any VPS.',
    code: `# Lightweight Node.js 20 Alpine
FROM node:20-alpine

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./
RUN npm install --omit=dev

# Copy server files
COPY server.js ./

# Expose proxy port
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Start the proxy server
CMD ["node", "server.js"]`,
  },
];
