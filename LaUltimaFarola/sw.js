/* Reemplazado por el service worker de la raíz del sitio (../sw.js). Este se da de baja solo. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(self.registration.unregister().then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url))));
});
