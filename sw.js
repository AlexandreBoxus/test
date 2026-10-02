/*
 * Service worker : rend le portail installable et consultable hors connexion.
 * Stratégie « réseau d'abord » : la version en ligne est toujours privilégiée,
 * la copie en cache ne sert que sans connexion. Les données Firebase ont leur propre cache.
 */
const CACHE = 'reseau-associatif-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/styles.css',
  'assets/js/utils.js',
  'assets/js/icons.js',
  'assets/js/config.js',
  'assets/js/seed.js',
  'assets/js/firebase-config.js',
  'assets/js/remote.js',
  'assets/js/store.js',
  'assets/js/ui.js',
  'assets/js/directory.js',
  'assets/js/agenda.js',
  'assets/js/forms.js',
  'assets/js/map.js',
  'assets/js/admin.js',
  'assets/js/admin-content.js',
  'assets/js/pages.js',
  'assets/js/app.js',
  'assets/icons/icon-192.png',
  'vendor/leaflet/leaflet.js',
  'vendor/leaflet/leaflet.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
