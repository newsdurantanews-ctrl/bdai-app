const CACHE = 'bdai-v1';
const STATIC = ['/', '/index.html', '/js/app.js', '/js/ai.js', '/js/firebase.js', '/js/admin.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(()=>{})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname.includes('firebaseapp') || url.hostname.includes('googleapis') || url.hostname.includes('pollinations')) {
    e.respondWith(fetch(e.request).catch(()=>new Response('',{status:503})));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok && e.request.method==='GET') {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
    }
    return res;
  }).catch(()=>new Response('',{status:503}))));
});
