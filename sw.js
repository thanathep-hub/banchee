/* บ้านบัญชี service worker — เปลี่ยนเลข VERSION ทุกครั้งที่อัปเดตแอพ */
const VERSION = 'baanbanchee-v3';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // หน้า HTML: network-first → ได้เวอร์ชันใหม่ทันทีเมื่อออนไลน์, offline ค่อยใช้ cache
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // cache font ของ Google และไฟล์ same-origin ที่โหลดสำเร็จ
        const url = e.request.url;
        const cacheable = res.ok && (
          url.startsWith(self.location.origin) ||
          url.includes('fonts.googleapis.com') ||
          url.includes('fonts.gstatic.com')
        );
        if (cacheable) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() =>
        // offline และไม่มี cache: ถ้าเป็นการเปิดหน้า ให้ส่ง index.html
        e.request.mode === 'navigate' ? caches.match('./index.html') : undefined
      );
    })
  );
});
