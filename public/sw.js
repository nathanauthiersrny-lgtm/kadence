// Kill-switch — replaces the old cache-first SW that served stale HTML
// across deploys and 404'd Next.js chunks. Keep this file deployed for at
// least one release cycle so previously-registered SWs receive it and
// unregister themselves; remove after the user base has flushed.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});
