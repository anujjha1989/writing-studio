// Service worker: lets the app open with no connection (only runs on https or localhost).
const SHELL = 'ws-shell-v3', DATA = 'ws-data-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(SHELL).then((c) => c.addAll(['./', 'style.css', 'app.js', 'lib.js', 'icons.js', 'text.js', 'manuscript.js', 'fonts/literata.woff2', 'fonts/literata-italic.woff2', 'fonts/instrument-sans.woff2']).catch(() => {}))); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const api = url.pathname.includes('/api/');
  if (api && !/\/api\/(records|changes)/.test(url.pathname)) return;
  // network first, fall back to the last copy seen
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(api ? DATA : SHELL).then((c) => c.put(e.request, copy)); } return r; })
    .catch(() => caches.match(e.request).then((hit) => hit || (api ? new Response('[]', { status: 503, headers: { 'Content-Type': 'application/json' } }) : caches.match('./')))));
});
