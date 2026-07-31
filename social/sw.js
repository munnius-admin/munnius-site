const CACHE = "munnius-social-v33";
const ASSETS = ["./", "./index.html", "./styles.css?v=33", "./app.js?v=33", "./supabase-client.js?v=33", "./config.js?v=33", "./vendor/html2canvas.min.js?v=33", "./manifest.webmanifest", "./assets/munnius-mark.png", "./assets/munnius-app-icon.png", "./assets/instagram.svg?v=9", "./assets/whatsapp-brand.svg", "./assets/google.svg?v=9"];
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
