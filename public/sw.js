/*
 * Service worker minimal.
 *
 * Il existe pour deux raisons, et deux seulement :
 *   1. Chrome n'émet `beforeinstallprompt` que si un service worker avec un
 *      handler `fetch` est enregistré. Sans lui, pas de proposition
 *      d'installation possible.
 *   2. Afficher une page lisible quand l'appareil est hors ligne.
 *
 * Il ne met volontairement AUCUN asset en cache. Vite génère des noms de
 * fichiers hachés et `index.html` n'est pas haché : un index.html servi depuis
 * le cache après un déploiement référencerait des chunks JS qui n'existent plus
 * côté serveur, et l'application planterait au chargement. Tout ce qui n'est pas
 * une navigation part donc directement au réseau, sans interception.
 */

const CACHE = "binieba-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  // Seules les navigations sont interceptées, et toujours en réseau d'abord :
  // le cache ne sert que si le réseau est injoignable.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
