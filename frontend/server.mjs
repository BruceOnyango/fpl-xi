// Production static server for the built SPA (PM2 app `fpl-web`).
//
// Why not `serve -s`: the app is built for the /fantasy-league/ base path, so URLs arrive as
// /fantasy-league/assets/…; `serve` would need nginx to strip the prefix, and it can't set
// different cache headers for hashed assets vs index.html. This is ~80 lines, no dependencies.
//
//   PORT       (default 3011)
//   HOST       (default 127.0.0.1 — nginx/Apache is the public entry point)
//   BASE_PATH  (default /fantasy-league/ — must match `base` in vite.config.ts)
//   DIST_DIR   (default ./dist)
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT ?? 3011);
const HOST = process.env.HOST ?? '127.0.0.1';
const BASE = `/${(process.env.BASE_PATH ?? '/fantasy-league/').replace(/^\/+|\/+$/g, '')}/`;
const DIST = resolve(here, process.env.DIST_DIR ?? 'dist');
const INDEX = join(DIST, 'index.html');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function fileAt(path) {
  try {
    const s = statSync(path);
    return s.isFile() ? s : null;
  } catch {
    return null;
  }
}

function send(res, path, stat, cacheControl, method) {
  res.writeHead(200, {
    'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
  });
  if (method === 'HEAD') return res.end();
  createReadStream(path).pipe(res);
}

const server = createServer((req, res) => {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  const url = new URL(req.url ?? '/', 'http://local');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
    return;
  }
  // /, /fantasy-league → /fantasy-league/
  if (pathname === '/' || pathname === BASE.slice(0, -1)) {
    res.writeHead(301, { Location: BASE + url.search }).end();
    return;
  }
  if (!pathname.startsWith(BASE)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }

  // Resolve inside DIST only (no ../ escapes).
  const rel = normalize(pathname.slice(BASE.length));
  const target = resolve(DIST, rel);
  if (target !== DIST && !target.startsWith(DIST + sep)) {
    res.writeHead(400).end();
    return;
  }

  const stat = rel && rel !== '.' ? fileAt(target) : null;
  if (stat) {
    // Hashed build output never changes; everything else revalidates.
    const immutable = rel.startsWith(`assets${sep}`) || rel.startsWith('assets/');
    send(res, target, stat, immutable ? 'public, max-age=31536000, immutable' : 'no-cache', method);
    return;
  }
  // Missing asset → real 404 (don't serve HTML as JS). Anything else is a client route.
  if (extname(rel) && extname(rel) !== '.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  const index = fileAt(INDEX);
  if (!index) {
    res.writeHead(503, { 'Content-Type': 'text/plain' }).end('Build missing: run `npm run build`.');
    return;
  }
  send(res, INDEX, index, 'no-cache', method);
});

server.listen(PORT, HOST, () => {
  console.log(`fpl-web serving ${DIST} at http://${HOST}:${PORT}${BASE}`);
  process.send?.('ready'); // PM2 wait_ready → reload only swaps once we're listening
});

// Graceful shutdown so `pm2 reload` doesn't drop in-flight requests.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => process.exit(0)));
}
