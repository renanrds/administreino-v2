// Estratégia Network First sem persistir cache de runtime.
// O SW também limpa qualquer cache legado no activate.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' }).catch(() => {
      if (event.request.mode === 'navigate') {
        return new Response('Sem conexao no momento.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      return new Response(null, { status: 504 });
    })
  );
});
