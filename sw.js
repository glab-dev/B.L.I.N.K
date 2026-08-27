// ==================== SERVICE WORKER ====================
// Provides offline caching for the B.L.I.N.K. PWA.
// SW_VERSION must match APP_VERSION in index.html and version.json.

const SW_VERSION = '2.11.186';
const CACHE_NAME = 'blink-v' + SW_VERSION;

// Local app files to pre-cache on install
const LOCAL_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/version.json',
  // core
  '/core/modals.js',
  '/core/utils.js',
  '/core/phase-balance.js',
  '/core/update.js',
  '/core/release-notes.js',
  '/core/supabase.js',
  '/core/auth-ui.js',
  '/core/state.js',
  '/core/undo.js',
  '/core/calculate.js',
  '/core/gear-data.js',
  '/core/init.js',
  // specs
  '/specs/panels.js',
  '/specs/processors.js',
  '/specs/custom-panels.js',
  '/specs/custom-processors.js',
  '/specs/processor-topology.js',
  // screens
  '/screens/multi-screen.js',
  // structure
  '/structure/plates.js',
  '/structure/bumpers.js',
  '/structure/weight.js',
  '/structure/drawing.js',
  // layouts
  '/layouts/standard.js',
  '/layouts/power.js',
  '/layouts/data.js',
  '/layouts/data-ports.js',
  '/layouts/structure.js',
  // interact
  '/interact/standard-canvas.js',
  '/interact/touch-gestures.js',
  '/interact/tab-reorder.js',
  // nav
  '/nav/gear.js',
  '/nav/cable-diagram.js',
  '/nav/combined-cable-diagram.js',
  '/nav/canvas.js',
  '/nav/raster.js',
  '/nav/combined.js',
  '/nav/navigation.js',
  '/nav/welcome.js',
  // export
  '/export/canvas-export.js',
  '/export/view-export.js',
  '/export/title-block.js',
  '/export/resolume.js',
  '/export/pdfLayoutEngine.js',
  '/export/pdf.js',
  '/export/pdf-preview.js',
  '/export/export-all.js',
  '/export/export-modal.js',
  // config
  '/config/setup.js',
  '/config/save-load.js',
  '/config/gear-codes.js',
  '/config/distro-wiring.js',
  '/config/dom-setup.js',
  // tools
  '/tools/testpattern.js',
  // fonts (self-hosted for offline support)
  '/fonts/bangers-latin.woff2',
  '/fonts/roboto-condensed-latin.woff2',
  '/fonts/material-symbols-outlined.woff2',
  // manifest & icons
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// CDN dependencies to cache on first fetch
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.9/pdfmake.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.9/vfs_fonts.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/dist/umd/supabase.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js'
];

// URLs that should always try network first (update-critical)
const NETWORK_FIRST_PATHS = ['/version.json', '/index.html'];

// Install: pre-cache all assets
self.addEventListener('install', event => {
  console.log('[SW] Installing v' + SW_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache CDN assets individually (don't fail install if CDN is down)
      var cdnPromises = CDN_ASSETS.map(function(url) {
        return cache.add(url).catch(function(err) {
          console.log('[SW] CDN cache skip:', url, err.message);
        });
      });
      // Local assets are required. addAll is atomic: if any one file fails to
      // fetch, the install rejects, this SW never activates, and the previous
      // cache is left intact so the app keeps working on the old version.
      // Caching them individually let the SW activate with a hole in its cache,
      // which silently 404'd a module and broke the app after an update.
      return cache.addAll(LOCAL_ASSETS).then(function() {
        return Promise.allSettled(cdnPromises);
      }).catch(function(err) {
        console.log('[SW] Install failed, keeping previous version:', err.message);
        throw err;
      });
    })
  );
});

// Activate: clean up old caches, take control
self.addEventListener('activate', event => {
  console.log('[SW] Activating v' + SW_VERSION);
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME)
             .map(name => {
               console.log('[SW] Deleting old cache:', name);
               return caches.delete(name);
             })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for critical files, cache-first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Network-first for update-critical paths
  if (NETWORK_FIRST_PATHS.some(path => url.pathname.endsWith(path))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Network-first for cross-origin requests (CDN scripts, Supabase)
  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Development: use network-first on localhost so file changes are always picked up
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first for same-origin local assets
  event.respondWith(cacheFirst(event.request));
});

// Network-first: try network, fall back to cache (ignoring query params)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Cache the fresh response (store under clean URL without query params)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline — try cache, ignoring query params (e.g. version.json?_=123)
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return new Response('Network unavailable', { status: 503, statusText: 'Offline' });
  }
}

// Cache-first: try cache, fall back to network (and cache the result)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    // Only cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline and not in cache — return a basic offline fallback for navigation
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    // For non-critical resources (favicon, etc.), return empty 404 instead of throwing
    return new Response('', { status: 404, statusText: 'Not Found' });
  }
}

// Listen for SKIP_WAITING message from the page
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
