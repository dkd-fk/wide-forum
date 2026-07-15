// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WIDE Forum — Service Worker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CACHE_NAME = 'wide-forum-v5'; // 버전 번호를 올려 기존 캐시 갱신 유도
const STATIC_ASSETS = [
  './', 
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/api.js',
  './js/auth.js',
  './js/components/feed.js',
  './js/components/modal.js',
  './icon-192.png',
  './icon-512.png'
];

// ── 설치: 정적 파일 캐시 ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── 활성화: 이전 캐시 삭제 ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── 요청: 캐시 우선, 없으면 네트워크 ──
self.addEventListener('fetch', e => {
  // GAS 프록시 요청은 캐시 안 함
  if (e.request.url.includes('script.google.com')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // 정적 파일만 캐시에 추가
        if (e.request.method === 'GET' && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        }
        return res;
      });
    }).catch(() => caches.match('/index.html'))
  );
});

// ── 푸시 알림 수신 (Phase 3) ──
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'WIDE 포럼', body: '새 안건이 등록됐어요.' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    })
  );
});

// ── 알림 클릭 시 앱 열기 ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});
