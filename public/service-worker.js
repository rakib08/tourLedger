const CACHE_PREFIX = "tourledger-";
const SHELL_CACHE = "tourledger-shell-v3";
const ASSET_CACHE = "tourledger-assets-v3";
const SHELL_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch((error) =>
        console.warn("TourLedger shell precache skipped:", error),
      ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                ![SHELL_CACHE, ASSET_CACHE].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

function isCacheableStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/fonts/")) return true;
  return /\.(?:css|js|mjs|woff2?|ttf|otf|ico|svg|png|jpe?g|webp|avif)$/i.test(
    url.pathname,
  );
}

async function trimCache(cache, maxEntries = 100) {
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(
      keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)),
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation and all dynamic/financial requests are network-only.
  // Never cache HTML, RSC payloads, API responses, Supabase data, receipts or proofs.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match("/offline.html")) || Response.error();
      }),
    );
    return;
  }

  // Cache only versioned Next.js build assets and public static assets.
  if (!isCacheableStaticAsset(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (
            response &&
            response.ok &&
            (response.type === "basic" || response.type === "cors")
          ) {
            cache.put(request, response.clone());
            trimCache(cache).catch(() => {});
          }
          return response;
        })
        .catch(() => null);
      return cached || (await network) || Response.error();
    })(),
  );
});
