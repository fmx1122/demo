const CACHE = "wordlock-v1";
const STATIC = [
  ".",
  "index.html",
  "js/game.js",
  "data/libraries.json",
  "data/cet4.json",
  "data/cet6.json",
  "data/ielts.json",
  "data/toefl.json",
  "data/gre.json",
  "data/gaokao.json",
  "data/business.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match("index.html")))
  );
});
