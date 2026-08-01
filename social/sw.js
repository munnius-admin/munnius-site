const CACHE = "munnius-social-v39";
const ASSETS = ["./", "./index.html", "./styles.css?v=39", "./app.js?v=39", "./supabase-client.js?v=39", "./config.js?v=39", "./vendor/html2canvas.min.js?v=39", "./manifest.webmanifest", "./assets/munnius-mark.png", "./assets/munnius-mark-light.png", "./assets/munnius-app-icon.png", "./assets/instagram.svg?v=9", "./assets/whatsapp-brand.svg", "./assets/google.svg?v=9"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request, { cache: "no-store" }).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});
