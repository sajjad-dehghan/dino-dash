/**
 * Zero-dependency static file server for local play and for browser verification.
 *
 * ES modules do not load over `file://` in Chromium (ADR-001 §4), so `src/` must be
 * served from an HTTP origin. This script exists because the delivery must be runnable
 * at this revision; WS-12 (ENG-12) owns the pinned dev-dependency server and the npm
 * script that ADR-005 §2 calls for, and may supersede this file.
 *
 *   node tests/tools/static-server.mjs [port]
 *
 * It serves src/ only, same-origin, no directory listing, no network egress.
 */

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../src/', import.meta.url)));
const PORT = Number(process.argv[2] || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const target = resolve(join(ROOT, normalize(decodeURIComponent(requested))));

  if (!target.startsWith(ROOT)) {
    response.writeHead(403).end('forbidden');
    return;
  }

  let stats;
  try {
    stats = statSync(target);
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  if (!stats.isFile()) {
    response.writeHead(404).end('not found');
    return;
  }

  response.writeHead(200, {
    'content-type': MIME[extname(target)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  createReadStream(target).pipe(response);
});

server.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`dino-dash: serving src/ at http://127.0.0.1:${PORT}/\n`);
});
