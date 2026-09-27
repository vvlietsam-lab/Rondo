/* RONDO service worker — maakt het spel offline speelbaar.
   De pagina zelf gaat altijd eerst via het netwerk, zodat je na een update meteen de nieuwe
   versie krijgt; alleen zonder verbinding valt hij terug op de bewaarde kopie. */
const CACHE = "rondo-v49";
const BESTANDEN = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BESTANDEN.map(u => new Request(u, {cache: "reload"}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isPagina = e.request.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/") ||
    url.pathname.endsWith(".webmanifest");
  if (isPagina) {
    /* netwerk eerst: altijd de nieuwste versie */
    e.respondWith(
      fetch(e.request, {cache: "no-store"}).then(res => {
        if (res && res.status === 200) { const kopie = res.clone(); caches.open(CACHE).then(c => c.put(e.request, kopie)); }
        return res;
      }).catch(() => caches.match(e.request).then(c => c || caches.match("./index.html")))
    );
    return;
  }
  /* iconen e.d.: uit de cache, op de achtergrond verversen */
  e.respondWith(
    caches.match(e.request).then(cached => {
      const net = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const kopie = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, kopie));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
