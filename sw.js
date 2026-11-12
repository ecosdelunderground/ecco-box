// Service worker: guarda la app para que funcione sin conexión.
// Estrategia: red primero (así llegan las actualizaciones) y caché si no hay red.
const CACHE = 'ecco-box-v9';
const FILES = ['./', 'index.html', 'style.css', 'data.js', 'planner.js', 'pictos.js', 'sounds.js', 'player.js', 'app.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'fonts/fonts.css', 'fonts/Archivo-normal-latin.woff2', 'fonts/Archivo-normal-latin-ext.woff2', 'fonts/Newsreader-normal-latin.woff2', 'fonts/Newsreader-normal-latin-ext.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Solo se guardan los archivos propios.
  const cacheable = url.origin === location.origin;
  if (!cacheable) return;
  e.respondWith(
    fetch(e.request)
      .then(r => { if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
