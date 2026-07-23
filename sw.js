// Service worker for यथारूप. This app already promises "runs entirely in
// the browser, nothing is sent to a server" — this cache is what makes
// that true even with no internet connection at all, once installed.
//
// Strategy: cache-first for everything in the app shell (this is a
// single-page tool with no server API, so there's no "fresh data" to miss
// by serving from cache). Bump CACHE_VERSION when you ship a change to any
// file below — that's what forces the old cache to be replaced.
const CACHE_VERSION = 'yatharoop-v17';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './favicon.ico',
  './favicon-16.png',
  './favicon-32.png',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './js/vendor/xlsx.full.min.js',
  './js/vendor/html2canvas.min.js',
  './js/vendor/jspdf.umd.min.js',
  './js/vendor/cfb.min.js',
  './js/converter.js',
  './js/biffFontParser.js',
  './js/processor.js',
  './js/persistence.js',
  './js/fileSystemAccess.js',
  './js/data/dictionary.js',
  './js/data/bigrams.js',
  './js/ui.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Best-effort: cache anything new same-origin so a later offline
          // launch still has it (e.g. a file added after this list was written).
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached: for a navigation request, fall back to
          // the app shell itself rather than showing the browser's dino.
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          throw new Error('offline and not cached');
        });
    })
  );
});
