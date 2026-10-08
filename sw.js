/* Service worker: keeps the app shell available offline. Data and photos come from Supabase. */
const VERSION = 'wearcycle-v1.32.0';
// Kept across app updates: the background-removal model (about 100 MB, downloaded once) and saved cut-outs.
const KEEP = ['wearcycle-bgr-1', 'wearcycle-cutouts'];
const SHELL = ['./', 'index.html', 'styles.css', 'logic.js', 'i18n.js', 'app.js', 'config.js', 'vendor/supabase.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/logo-icon.svg',
  'fonts/fonts.css', 'fonts/big-shoulders-display-latin-700-normal.woff2', 'fonts/big-shoulders-display-latin-800-normal.woff2', 'fonts/big-shoulders-display-latin-ext-700-normal.woff2', 'fonts/big-shoulders-display-latin-ext-800-normal.woff2', 'fonts/figtree-latin-400-normal.woff2', 'fonts/figtree-latin-500-normal.woff2', 'fonts/figtree-latin-600-normal.woff2', 'fonts/figtree-latin-700-normal.woff2', 'fonts/figtree-latin-ext-400-normal.woff2', 'fonts/figtree-latin-ext-500-normal.woff2', 'fonts/figtree-latin-ext-600-normal.woff2', 'fonts/figtree-latin-ext-700-normal.woff2', 'fonts/jetbrains-mono-latin-500-normal.woff2', 'fonts/jetbrains-mono-latin-600-normal.woff2', 'fonts/jetbrains-mono-latin-ext-500-normal.woff2', 'fonts/jetbrains-mono-latin-ext-600-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && !KEEP.includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return; // never cache Supabase API or photo URLs
  if (sameOrigin && url.pathname.includes('/vendor/bgr-data/')) { // model files never change: cache first
    e.respondWith(caches.open('wearcycle-bgr-1').then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  // Network first for the app files, so updates arrive on the next open; cache as fallback offline.
  // App files skip the browser's HTTP cache (GitHub Pages allows 10 minutes), so a new version shows on the next open.
  const net = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
  e.respondWith(net.then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
