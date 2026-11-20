// Service worker de Lacre: guarda la app en el celular para que la estación de hostess abra sin señal.
// - /api/*: nunca se intercepta (los datos sin conexión los maneja la app con su propia lista guardada).
// - Páginas (navegación): primero la red; sin red, la última versión guardada de la app.
// - /assets/*: archivos con hash en el nombre (nunca cambian): primero el caché.
const CACHE = 'lacre-app-v2'
const SHELL = '/index.html'
// Vite y Netlify mandan "Vary: Origin": los scripts de módulo piden con Origin y lo guardado no lo trae.
// Sin ignoreVary el caché no los reconoce y la app no abre sin señal.
const MATCH = { ignoreVary: true }

self.addEventListener('install', () => self.skipWaiting())

// Al cambiar de versión, lo ya guardado se pasa al caché nuevo antes de borrar el viejo:
// así un celular que ya tenía la app no se queda sin ella justo antes del evento.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const current = await caches.open(CACHE)
      for (const name of await caches.keys()) {
        if (name === CACHE || !name.startsWith('lacre-app')) continue
        const old = await caches.open(name)
        for (const req of await old.keys()) {
          if (!(await current.match(req, MATCH))) {
            const res = await old.match(req)
            if (res) await current.put(req, res)
          }
        }
        await caches.delete(name)
      }
      await self.clients.claim()
    })(),
  )
})

// La página avisa qué archivos ya cargó antes de que este service worker tomara el control.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache-urls') return
  const urls = event.data.urls.filter((u) => {
    try {
      const url = new URL(u, self.location.origin)
      return url.origin === self.location.origin && !url.pathname.startsWith('/api/')
    } catch {
      return false
    }
  })
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all([SHELL, ...urls].map((u) => cache.add(u).catch(() => {}))),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Todas las rutas de la app sirven el mismo index.html: se guarda como "la app".
          if (res.ok) {
            const copy = res.clone()
            void caches.open(CACHE).then((c) => c.put(SHELL, copy))
          }
          return res
        })
        .catch(() => caches.match(SHELL, MATCH).then((cached) => cached ?? Response.error())),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req, MATCH).then(
        (cached) =>
          cached ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              void caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
    return
  }

  // Íconos y demás archivos sueltos: se usa lo guardado y se actualiza en segundo plano.
  event.respondWith(
    caches.match(req, MATCH).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            void caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
        .catch(() => cached ?? Response.error())
      return cached ?? network
    }),
  )
})
