const CACHE = "munnius-social-v37";
const ASSETS = ["./", "./index.html", "./styles.css?v=37", "./app.js?v=37", "./supabase-client.js?v=37", "./config.js?v=37", "./vendor/html2canvas.min.js?v=37", "./manifest.webmanifest", "./assets/munnius-mark.png", "./assets/munnius-mark-light.png", "./assets/munnius-app-icon.png", "./assets/instagram.svg?v=9", "./assets/whatsapp-brand.svg", "./assets/google.svg?v=9"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});
