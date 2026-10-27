// Each release is a coherent offline snapshot. Upload assets before this worker.
const CACHE_NAME = "badboy-pinball-v13";
const CACHE_PREFIX = "badboy-pinball-";
const scopedURL = (file) => new URL(file, self.registration.scope).href;
const GAME_URL = scopedURL("./index.html");
const GAME_PATHS = new Set([
  new URL(GAME_URL).pathname,
  new URL("./", self.registration.scope).pathname,
]);
const MUSIC_FILES = [
  "./assets/lucky-seven-song.mp3",
  "./assets/lucky-seven-theme.mp3",
];
const MUSIC_URLS = new Set(MUSIC_FILES.map(scopedURL));
const STATIC_URLS = [
  "./assets/icon-180.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./manifest.webmanifest",
  "./pwa.js",
  ...MUSIC_FILES,
].map(scopedURL);

self.addEventListener("install", (event) => {
  // Both MP3s are required: a successful installation guarantees offline music.
  // Do not skipWaiting here; the menu must offer activation without losing a run.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          [GAME_URL, ...STATIC_URLS].map(
            (url) => new Request(url, { cache: "reload" }),
          ),
        ),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names
              .filter(
                (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME,
              )
              .map((name) => caches.delete(name)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});

/** Cached MP3s are complete blobs, but media players also request byte ranges.
 * Keep inclusive HTTP offsets separate from Blob.slice's exclusive upper bound. */
async function audioRangeResponse(cached, header) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match) return cached;
  const blob = await cached.blob();
  const size = blob.size;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end = match[1]
    ? match[2]
      ? Math.min(Number(match[2]), size - 1)
      : size - 1
    : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start > end ||
    start >= size
  ) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Content-Type": cached.headers.get("Content-Type") || "audio/mpeg",
    },
  });
}

async function cachedAssetResponse(request, url) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url.href);
  if (!cached) return fetch(request);
  if (MUSIC_URLS.has(url.href) && request.headers.has("range")) {
    return audioRangeResponse(cached, request.headers.get("range"));
  }
  return cached;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && GAME_PATHS.has(url.pathname)) {
    // A waiting release must never leak its HTML into the currently active version.
    event.respondWith(
      caches
        .open(CACHE_NAME)
        .then(async (cache) => (await cache.match(GAME_URL)) || fetch(request)),
    );
  } else if (STATIC_URLS.includes(url.href)) {
    event.respondWith(cachedAssetResponse(request, url));
  }
});
