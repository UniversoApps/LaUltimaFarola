/* La última farola — portada y juego sin conexión */
const CACHE = 'ultima-farola-v2';
const G = 'LaUltimaFarola/';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  G, G + 'index.html', G + 'style.css',
  G + 'data.js', G + 'art.js', G + 'audio.js', G + 'input.js', G + 'game.js', G + 'ui.js', G + 'main.js',
  G + 'icon-192.png', G + 'icon-512.png', G + 'maskable-512.png', G + 'apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit))));
    return;
  }
  if (url.origin !== location.origin) return;
  // primero la red (para recibir actualizaciones); sin conexión, la copia guardada
  e.respondWith(
    fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match(url.pathname.includes('/' + G) ? G + 'index.html' : 'index.html')))
  );
});
