/* AcademIQ service worker: network-first, so updates always load; cache is only an offline fallback.
   Bump CACHE (v1 -> v2) whenever you want to force-refresh old installs. */
const CACHE = 'academiq-v1';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'config.js', 'icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || /\.pdf$/i.test(u.pathname)) return; // never touch Apps Script, Drive, pdf.js or PDFs
  e.respondWith(
    fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('index.html')))
  );
});
