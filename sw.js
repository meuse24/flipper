// PWA cache lifecycle adapted from M24 Lucky Seven for BADBOY Pinball.
const CACHE_NAME = 'badboy-pinball-v6';
const CACHE_PREFIX = 'badboy-pinball-';
const GAME_URL = new URL('./index.html', self.registration.scope).href;
const STATIC_URLS = ['./assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest','./pwa.js','./assets/lucky-seven-song.mp3','./assets/lucky-seven-theme.mp3'].map(file => new URL(file, self.registration.scope).href);
const OPTIONAL_URLS = [], MUSIC_URLS = ['./assets/lucky-seven-song.mp3','./assets/lucky-seven-theme.mp3'].map(file=>new URL(file,self.registration.scope).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all([
        // Revalidate deployment files instead of reusing the browser's HTTP cache.
        cache.addAll([GAME_URL, ...STATIC_URLS.filter((url) => !OPTIONAL_URLS.includes(url))]
          .map((url) => new Request(url, { cache: 'reload' }))),
        // Either optional song may be absent without blocking offline installation.
        ...OPTIONAL_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})),
      ]),
    ),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && (url.pathname === new URL(GAME_URL).pathname || url.pathname === new URL('./', self.registration.scope).pathname)) {
    // Keep the installed game stable until activation. Never read a waiting
    // worker's cache or overwrite this version with newer network HTML.
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => (await cache.match(GAME_URL)) || fetch(request)),
    );
    return;
  }

  if (!STATIC_URLS.includes(url.href)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(url.href)).then(async (cached) => {
      if (!cached) return fetch(request);
      if (!MUSIC_URLS.includes(url.href) || !request.headers.has('range')) return cached;

      // Audio players often ask for byte ranges, even when the whole song is cached.
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range'));
      if (!match) return cached;
      const blob = await cached.blob();
      const size = blob.size;
      const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
      const end = match[1]
        ? match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
        : size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
        return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
      }
      return new Response(blob.slice(start, end + 1), {
        status: 206,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1),
          'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
        },
      });
    }),
  );
});
