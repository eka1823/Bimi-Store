/* BIMI Store — service worker
   Membuat aplikasi bisa dibuka tanpa internet.
   Naikkan VERSI setiap kali index.html diperbarui. */
const VERSI = 'bimi-v7';

const INTI = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSI)
      .then(c => Promise.allSettled(INTI.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== VERSI).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Halaman: coba jaringan dulu supaya versi baru cepat terpakai,
  // kalau offline ambil dari simpanan.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const salinan = res.clone();
          caches.open(VERSI).then(c => c.put('./index.html', salinan));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Aset lain (ikon, font): pakai simpanan dulu, biar cepat & bisa offline.
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 &&
            (url.origin === location.origin || url.hostname.includes('gstatic') || url.hostname.includes('googleapis'))) {
          const salinan = res.clone();
          caches.open(VERSI).then(c => c.put(req, salinan));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
