import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Upstream proxy fetch helper
async function proxyFetch(targetUrl: string, req: Request, res: Response, customHeaders: Record<string, string> = {}) {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://krunker.io/',
      'Origin': 'https://krunker.io',
      'Accept': req.headers['accept'] || '*/*',
      ...customHeaders,
    };

    if (req.headers['range']) {
      headers['Range'] = req.headers['range'] as string;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const upstreamRes = await fetch(targetUrl, fetchOptions);

    res.status(upstreamRes.status);
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const buffer = await upstreamRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error(`[Proxy Fetch Error] ${targetUrl}:`, error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Proxy fetch failed', target: targetUrl, message: error.message });
    }
  }
}

// Injected client runtime proxy script:
// Monkeypatches window.WebSocket, window.fetch, and XMLHttpRequest
// so ALL game requests route 100% through this server, without touching krunker.io directly!
const CLIENT_RUNTIME_SHIM = `
<script>
(function() {
  console.log('[Krunker Proxy Core] Initializing deep site proxy runtime...');

  const proxyHost = window.location.host;
  const proxyProto = window.location.protocol;
  const proxyWsProto = proxyProto === 'https:' ? 'wss:' : 'ws:';

  // 1. Monkeypatch WebSocket to tunnel all multiplayer traffic through /api/proxy-ws
  const NativeWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    let targetUrl = url;
    try {
      if (typeof url === 'string') {
        const isWs = url.startsWith('ws://') || url.startsWith('wss://');
        if (isWs) {
          const tunnelUrl = proxyWsProto + '//' + proxyHost + '/api/proxy-ws?target=' + encodeURIComponent(url);
          console.log('[Krunker WS Tunnel] Rerouting game socket:', url, '->', tunnelUrl);
          targetUrl = tunnelUrl;
        }
      }
    } catch (e) {
      console.error('[Krunker WS Error]', e);
    }
    return protocols ? new NativeWebSocket(targetUrl, protocols) : new NativeWebSocket(targetUrl);
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket.CONNECTING = NativeWebSocket.CONNECTING;
  window.WebSocket.OPEN = NativeWebSocket.OPEN;
  window.WebSocket.CLOSING = NativeWebSocket.CLOSING;
  window.WebSocket.CLOSED = NativeWebSocket.CLOSED;

  // 2. Monkeypatch window.fetch to route external Krunker domains through server
  const NativeFetch = window.fetch;
  window.fetch = function(input, init) {
    let url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    try {
      if (url.startsWith('https://assets.krunker.io/')) {
        url = url.replace('https://assets.krunker.io/', '/assets/');
      } else if (url.startsWith('//assets.krunker.io/')) {
        url = url.replace('//assets.krunker.io/', '/assets/');
      } else if (url.startsWith('https://matchmaker.krunker.io/')) {
        url = '/api/proxy/stream?url=' + encodeURIComponent(url);
      } else if (url.startsWith('https://api.krunker.io/')) {
        url = '/api/proxy/stream?url=' + encodeURIComponent(url);
      } else if (url.startsWith('https://krunker.io/')) {
        url = url.replace('https://krunker.io/', '/');
      }
      if (typeof input === 'string') {
        input = url;
      } else if (input && input.url) {
        input = new Request(url, init || input);
      }
    } catch(e) {}
    return NativeFetch.call(this, input, init);
  };

  // 3. Monkeypatch XMLHttpRequest.prototype.open
  const nativeOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    let rewritten = url;
    try {
      if (typeof url === 'string') {
        if (url.startsWith('https://assets.krunker.io/')) {
          rewritten = url.replace('https://assets.krunker.io/', '/assets/');
        } else if (url.startsWith('https://matchmaker.krunker.io/')) {
          rewritten = '/api/proxy/stream?url=' + encodeURIComponent(url);
        } else if (url.startsWith('https://api.krunker.io/')) {
          rewritten = '/api/proxy/stream?url=' + encodeURIComponent(url);
        } else if (url.startsWith('https://krunker.io/')) {
          rewritten = url.replace('https://krunker.io/', '/');
        }
      }
    } catch(e) {}
    return nativeOpen.call(this, method, rewritten, ...args);
  };

  // 4. Pointer Lock & Canvas Focus helper
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Krunker Proxy Core] Page DOM fully loaded via proxy.');
    // Enable auto-click focus
    document.body.addEventListener('click', () => {
      const canvas = document.getElementById('game-canvas') || document.querySelector('canvas');
      if (canvas && !document.pointerLockElement) {
        try { canvas.requestPointerLock?.(); } catch(e) {}
      }
    });
  });
})();
</script>
`;

// ==========================================
// Krunker Direct Site Gateway: /krunker-live
// Fetches the entire site from https://krunker.io and serves it directly!
// ==========================================
app.get('/krunker-live', async (req: Request, res: Response) => {
  try {
    const upstreamRes = await fetch('https://krunker.io/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    res.status(upstreamRes.status);
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    let html = await upstreamRes.text();

    // 1. Rewrite relative paths to root paths (so /libs, /css, /static are fetched through this server)
    html = html.replace(/src="\.\/libs\//g, 'src="/libs/');
    html = html.replace(/src="\.\/static\//g, 'src="/static/');
    html = html.replace(/src="\.\/img\//g, 'src="/img/');
    html = html.replace(/href="\.\/css\//g, 'href="/css/');
    html = html.replace(/href="\.\/img\//g, 'href="/img/');
    html = html.replace(/href="\.\/libs\//g, 'href="/libs/');
    html = html.replace(/url\(\.\/img\//g, 'url(/img/');

    // 2. Rewrite https://assets.krunker.io to /assets/
    html = html.replace(/https:\/\/assets\.krunker\.io\//g, '/assets/');
    html = html.replace(/\/\/assets\.krunker\.io\//g, '/assets/');

    // 3. Spoof domain check in Krunker: ["krunker.io","browserfps.com"].includes(location.hostname) -> true
    html = html.replace(
      /\["krunker\.io","browserfps\.com"\]\.includes\(location\.hostname\)/g,
      'true'
    );

    // 4. Inject our full client runtime shim into <head>
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${CLIENT_RUNTIME_SHIM}`);
    } else {
      html = `${CLIENT_RUNTIME_SHIM}` + html;
    }

    res.send(html);
  } catch (err: any) {
    console.error('[Krunker-Live Error]', err);
    res.status(502).send(`Failed to fetch krunker.io upstream: ${err.message}`);
  }
});

// Root static & asset proxies for Krunker assets
app.use('/static', (req: Request, res: Response) => {
  proxyFetch(`https://krunker.io/static${req.url}`, req, res);
});

app.use('/libs', (req: Request, res: Response) => {
  proxyFetch(`https://krunker.io/libs${req.url}`, req, res);
});

app.use('/css', (req: Request, res: Response) => {
  proxyFetch(`https://krunker.io/css${req.url}`, req, res);
});

app.use('/img', (req: Request, res: Response) => {
  proxyFetch(`https://krunker.io/img${req.url}`, req, res);
});

app.use('/pkg', (req: Request, res: Response) => {
  proxyFetch(`https://krunker.io/pkg${req.url}`, req, res);
});

app.use('/textures', (req: Request, res: Response) => {
  proxyFetch(`https://assets.krunker.io/textures${req.url}`, req, res);
});

app.use('/models', (req: Request, res: Response) => {
  proxyFetch(`https://assets.krunker.io/models${req.url}`, req, res);
});

app.use('/sound', (req: Request, res: Response) => {
  proxyFetch(`https://assets.krunker.io/sound${req.url}`, req, res);
});

app.use('/assets', (req: Request, res: Response) => {
  proxyFetch(`https://assets.krunker.io${req.url}`, req, res);
});

app.get('/manifest.json', (req: Request, res: Response) => {
  proxyFetch('https://krunker.io/manifest.json', req, res);
});

// Matchmaker & game seeking proxies
app.all('/seek-game', (req: Request, res: Response) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  proxyFetch(`https://matchmaker.krunker.io/seek-game${query}`, req, res);
});

app.all('/games*', (req: Request, res: Response) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  proxyFetch(`https://matchmaker.krunker.io${req.path}${query}`, req, res);
});

app.all('/game-info*', (req: Request, res: Response) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  proxyFetch(`https://matchmaker.krunker.io${req.path}${query}`, req, res);
});

// Legacy subpath proxy handler (/api/proxy/krunker/*)
app.all('/api/proxy/krunker*', (req: Request, res: Response) => {
  const subpath = req.path.replace(/^\/api\/proxy\/krunker/, '') || '/';
  if (subpath === '/' || subpath === '') {
    return res.redirect('/krunker-live');
  }
  const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  proxyFetch(`https://krunker.io${subpath}${queryString}`, req, res);
});

// Universal streaming proxy
app.get('/api/proxy/stream', (req: Request, res: Response) => {
  const rawUrl = req.query.url as string;
  if (!rawUrl) return res.status(400).send('Missing url parameter');
  proxyFetch(rawUrl, req, res);
});

// Diagnostic latency test
const KRUNKER_SERVERS = [
  { id: 'master', name: 'Krunker Master Web', host: 'https://krunker.io', region: 'Global' },
  { id: 'matchmaker', name: 'Matchmaker Node', host: 'https://matchmaker.krunker.io', region: 'Global' },
  { id: 'assets', name: 'CDN Assets Hub', host: 'https://assets.krunker.io', region: 'Cloudflare' },
  { id: 'useast', name: 'US East (New York)', host: 'https://ny.krunker.io', region: 'North America' },
  { id: 'uswest', name: 'US West (Silicon Valley)', host: 'https://sjc.krunker.io', region: 'North America' },
  { id: 'eu-fra', name: 'Europe (Frankfurt)', host: 'https://fra.krunker.io', region: 'Europe' },
  { id: 'eu-lon', name: 'Europe (London)', host: 'https://lon.krunker.io', region: 'Europe' },
  { id: 'asia-tok', name: 'Asia (Tokyo)', host: 'https://tok.krunker.io', region: 'Asia Pacific' },
  { id: 'oce-syd', name: 'Oceania (Sydney)', host: 'https://syd.krunker.io', region: 'Australia' },
];

app.get('/api/ping', async (req: Request, res: Response) => {
  const targetId = req.query.id as string;
  const serversToCheck = targetId ? KRUNKER_SERVERS.filter(s => s.id === targetId) : KRUNKER_SERVERS;

  const results = await Promise.all(
    serversToCheck.map(async (serverInfo) => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const resp = await fetch(serverInfo.host, {
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        clearTimeout(timeout);
        return {
          id: serverInfo.id,
          name: serverInfo.name,
          host: serverInfo.host,
          region: serverInfo.region,
          status: resp.status,
          online: resp.status < 500,
          latencyMs: Date.now() - start,
        };
      } catch (err: any) {
        return {
          id: serverInfo.id,
          name: serverInfo.name,
          host: serverInfo.host,
          region: serverInfo.region,
          status: 0,
          online: false,
          latencyMs: 999,
          error: err.name === 'AbortError' ? 'Timeout' : 'Unreachable',
        };
      }
    })
  );

  res.json({ timestamp: Date.now(), results });
});

app.get('/api/proxy/config', (_req: Request, res: Response) => {
  res.json({
    proxyVersion: '2.5.0',
    capabilities: {
      directSiteMirror: true,
      httpProxy: true,
      webSocketProxy: true,
      pointerLockBypass: true,
      antiFrameBuster: true,
      fullAssetMirroring: true,
    },
    endpoints: {
      directLive: '/krunker-live',
      websocket: '/api/proxy-ws',
      assets: '/assets/*',
    },
  });
});

// Setup WebSocket Server for WS Proxying
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (clientWs: WebSocket, req: http.IncomingMessage) => {
  const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
  const target = urlObj.searchParams.get('target');

  if (!target) {
    clientWs.close(1008, 'Target query parameter missing');
    return;
  }

  let remoteWs: WebSocket | null = null;
  try {
    remoteWs = new WebSocket(target, {
      headers: {
        'Origin': 'https://krunker.io',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    const pendingQueue: any[] = [];

    remoteWs.on('open', () => {
      while (pendingQueue.length > 0) {
        const msg = pendingQueue.shift();
        remoteWs?.send(msg);
      }
    });

    remoteWs.on('message', (data: any, isBinary: boolean) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data, { binary: isBinary });
      }
    });

    remoteWs.on('close', (code: number, reason: Buffer) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason.toString());
      }
    });

    remoteWs.on('error', (err: Error) => {
      console.error('[Remote WS Error]', err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, 'Remote connection failed');
      }
    });

    clientWs.on('message', (data: any, isBinary: boolean) => {
      if (remoteWs?.readyState === WebSocket.OPEN) {
        remoteWs.send(data, { binary: isBinary });
      } else if (remoteWs?.readyState === WebSocket.CONNECTING) {
        pendingQueue.push(data);
      }
    });

    clientWs.on('close', (code: number, reason: Buffer) => {
      if (remoteWs && remoteWs.readyState === WebSocket.OPEN) {
        remoteWs.close(code, reason.toString());
      }
    });

    clientWs.on('error', (err: Error) => {
      console.error('[Client WS Error]', err.message);
      if (remoteWs && remoteWs.readyState === WebSocket.OPEN) {
        remoteWs.close(1011, 'Client error');
      }
    });
  } catch (err: any) {
    console.error('[Proxy WS Init Error]', err);
    clientWs.close(1011, err.message);
  }
});

// Handle WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const urlObj = new URL(request.url || '', `http://${request.headers.host}`);
  if (urlObj.pathname === '/api/proxy-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// Attach Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Krunker Proxy Hub] Direct mirror listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Startup Error]', err);
});
