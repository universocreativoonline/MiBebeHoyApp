/* Mi Bebé Hoy · Service Worker
   v4: la página (index.html) se pide SIEMPRE primero a la red, y el caché
   solo se usa si no hay conexión. Así nunca se queda pegada una versión vieja. */
var CACHE = "mibebehoy-v5";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./bebe.png.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  var isPage = e.request.mode === "navigate" ||
    (e.request.destination === "document") ||
    e.request.url.indexOf("index.html") !== -1;

  if (isPage) {
    /* Red primero: siempre la última versión; caché solo sin conexión */
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (cached) {
          return cached || caches.match("./index.html");
        });
      })
    );
    return;
  }

  /* Recursos (imagen, manifest): caché primero para carga instantánea */
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).then(function (res) {
        var copy = res.clone();
        if (res.ok && e.request.url.indexOf(self.location.origin) === 0) {
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return cached; });
    })
  );
});
