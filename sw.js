/* RONDO service worker — maakt het spel offline speelbaar.
   De pagina zelf gaat altijd eerst via het netwerk, zodat je na een update meteen de nieuwe
   versie krijgt; alleen zonder verbinding valt hij terug op de bewaarde kopie. */
const CACHE = "rondo-v50";
const BESTANDEN = ["./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable.png"];

self.addEventListener("install", e => {
  /* een mislukte voorkopie mag de installatie nooit blokkeren */
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BESTANDEN.map(u => new Request(u, {cache: "reload"})))).catch(() => {})
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
    /* Safari weigert fetch(request, opties) bij een navigatie; daarom een nieuw verzoek op de URL */
    const vers = new Request(url.href, {cache: "no-store", credentials: "same-origin"});
    e.respondWith(
      fetch(vers).then(res => {
        /* Safari weigert een doorverwezen antwoord op een navigatie (bv. /Rondo → /Rondo/) */
        if (res && res.redirected) return Response.redirect(res.url, 302);
        if (res && res.status === 200) { const kopie = res.clone(); caches.open(CACHE).then(c => c.put(e.request.url, kopie)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(e.request.url, {ignoreSearch: true})
        .then(c => c || caches.match("./index.html"))
        .then(c => c || fetch(e.request)))
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
