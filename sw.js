/* alcms service worker
   - Pages, scripts and JSON: network first, last cached copy when offline, offline page as a last resort.
   - Images/fonts/icons (same origin): served from cache and refreshed in the background.
   - ZXing scanner library (unpkg): cached after first use so camera scanning keeps working offline.
   - Everything else (GitHub sync, other APIs, other sites) is NOT touched and never cached.
   Bump VERSION to make every device drop its old caches and fetch fresh files. */
const VERSION = 'alcms-v1';
const SHELL_CACHE = VERSION + '-shell';
const ASSET_CACHE = VERSION + '-assets';
const SHELL = ['./', 'index.html', 'manifest.json', 'js/seed-data.js'];

const OFFLINE_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
  '<meta name="theme-color" content="#1F3A2E"><title>Offline</title>' +
  '<style>html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;' +
  'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#1F3A2E;color:#EFE8D3;text-align:center;' +
  'padding:env(safe-area-inset-top,0) 24px env(safe-area-inset-bottom,0)}' +
  'h1{font-size:22px;margin:0 0 8px}p{margin:0 0 20px;opacity:.8;line-height:1.5}' +
  'button{font:inherit;font-weight:600;padding:12px 22px;border-radius:10px;border:1px solid rgba(239,232,211,.6);' +
  'background:transparent;color:inherit;min-height:44px}</style></head><body><div>' +
  '<h1>You\u2019re offline</h1><p>This page isn\u2019t saved on your device yet.<br>Reconnect and try again.</p>' +
  '<button onclick="location.reload()">Try again</button></div></body></html>';

function offlinePage(){
  return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // add one by one so a missing file never fails the whole install
    await Promise.all(SHELL.map(u => shell.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    try {
      const res = await fetch(new Request('manifest.json', { cache: 'reload' }));
      if (res.ok) {
        const m = await res.json();
        const base = new URL('manifest.json', self.registration.scope);
        const assets = await caches.open(ASSET_CACHE);
        await Promise.all((m.icons || []).map(i => assets.add(new URL(i.src, base).href).catch(() => {})));
      }
    } catch (_) { /* no manifest icons to precache — fine */ }
    // No skipWaiting() here on purpose: an updated worker waits until the person taps "Refresh" in the app.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(VERSION + '-')).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(req, isNav) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }));
    if (res.ok) { cache.put(req.url, res.clone()); return res; }
    if (res.status < 500) return res;            // 404 etc.: show it as is
    throw new Error('server ' + res.status);       // 5xx: fall back to the cached copy
  } catch (err) {
    const hit = (await cache.match(req.url, { ignoreSearch: true })) ||
      (isNav && ((await cache.match('index.html')) || (await cache.match('./'))));
    if (hit) return hit;
    return isNav ? offlinePage() : Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  if (hit) { refresh.catch(() => {}); return hit; }
  return (await refresh) || Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const zxing = url.origin === 'https://unpkg.com' && url.pathname.startsWith('/@zxing/');
  if (!sameOrigin && !zxing) return;                       // GitHub sync, other APIs/sites: untouched
  if (sameOrigin && /\/api\//.test(url.pathname)) return;
  if (zxing) { event.respondWith(cacheFirst(req)); return; }
  if (req.mode === 'navigate') { event.respondWith(networkFirst(req, true)); return; }
  if (/\.(html|js|json|css)$/i.test(url.pathname) || url.pathname.endsWith('/')) { event.respondWith(networkFirst(req, false)); return; }
  event.respondWith(staleWhileRevalidate(req));
});
