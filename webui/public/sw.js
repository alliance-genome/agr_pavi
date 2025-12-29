/**
 * PAVI Service Worker
 * Provides offline support and caching for the PAVI web application
 */

const CACHE_NAME = 'pavi-cache-v1';
const OFFLINE_URL = '/offline';

// Static assets to cache immediately
const PRECACHE_ASSETS = [
    '/',
    '/offline',
    '/manifest.json',
];

// Cache strategies
const CACHE_STRATEGIES = {
    // Cache first for static assets
    cacheFirst: [
        /\.(?:js|css|woff2?|ttf|otf|eot)$/,
        /\/_next\/static\//,
    ],
    // Network first for API and dynamic content
    networkFirst: [
        /\/api\//,
        /\/result\//,
        /\/progress\//,
    ],
    // Stale while revalidate for pages
    staleWhileRevalidate: [
        /\/$/,
        /\/submit/,
        /\/jobs/,
        /\/help/,
    ],
};

// Install event - cache core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Determine caching strategy
    const strategy = getCacheStrategy(url.pathname);

    switch (strategy) {
        case 'cacheFirst':
            event.respondWith(cacheFirst(request));
            break;
        case 'networkFirst':
            event.respondWith(networkFirst(request));
            break;
        case 'staleWhileRevalidate':
            event.respondWith(staleWhileRevalidate(request));
            break;
        default:
            event.respondWith(networkFirst(request));
    }
});

// Determine which cache strategy to use
function getCacheStrategy(pathname) {
    for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
        if (patterns.some(pattern => pattern.test(pathname))) {
            return strategy;
        }
    }
    return 'networkFirst';
}

// Cache first strategy - good for static assets
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('Network error', { status: 503 });
    }
}

// Network first strategy - good for dynamic content
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
        }

        return new Response('Offline', { status: 503 });
    }
}

// Stale while revalidate - serve cached, then update
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    const networkResponsePromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => null);

    return cachedResponse || await networkResponsePromise || new Response('Offline', { status: 503 });
}

// Handle background sync for job submissions
self.addEventListener('sync', (event) => {
    if (event.tag === 'job-sync') {
        event.waitUntil(syncPendingJobs());
    }
});

// Sync pending jobs when back online
async function syncPendingJobs() {
    try {
        // Notify clients that we're back online
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({
                type: 'ONLINE_STATUS',
                payload: { isOnline: true },
            });
        });
    } catch (error) {
        console.error('Error syncing pending jobs:', error);
    }
}

// Handle push notifications (for job completion)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();

        const options = {
            body: data.body || 'Your alignment job has completed',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            tag: data.tag || 'pavi-notification',
            data: data.data,
            actions: [
                { action: 'view', title: 'View Results' },
                { action: 'dismiss', title: 'Dismiss' },
            ],
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'PAVI', options)
        );
    } catch (error) {
        console.error('Error showing notification:', error);
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'view' && event.notification.data?.url) {
        event.waitUntil(
            self.clients.openWindow(event.notification.data.url)
        );
    } else if (event.action !== 'dismiss') {
        event.waitUntil(
            self.clients.openWindow('/')
        );
    }
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CACHE_URLS':
            if (payload?.urls) {
                caches.open(CACHE_NAME)
                    .then((cache) => cache.addAll(payload.urls));
            }
            break;

        case 'CLEAR_CACHE':
            caches.delete(CACHE_NAME);
            break;
    }
});
