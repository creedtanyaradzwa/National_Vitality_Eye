// public/sw.js - Complete offline support
const CACHE_NAME = 'vitality-eye-v3';
const STATIC_CACHE = 'vitality-eye-static-v3';
const API_CACHE = 'vitality-eye-api-v3';

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/vite.svg'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log('Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Helper function to determine if URL is an API endpoint
function isApiRequest(url) {
    return url.includes('/medical-records') || 
           url.includes('/patients') || 
           url.includes('/api/auth/profile') ||
           url.includes('/ai/status');
}

// Helper function to determine if URL is a static asset
function isStaticAsset(url) {
    return url.includes('.js') || 
           url.includes('.css') || 
           url.includes('.svg') || 
           url.includes('.png') ||
           url.includes('.jpg') ||
           url === '/' ||
           url.includes('/index.html');
}

// Fetch event handler
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // API requests - Network First, fallback to cache
    if (isApiRequest(url.pathname)) {
        event.respondWith(
            fetch(event.request).then(response => {
                // Cache successful API responses
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(API_CACHE).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(async () => {
                // Offline - try cache
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Return offline data structure
                return new Response(JSON.stringify({
                    offline: true,
                    message: 'You are offline. Showing cached data.',
                    data: []
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }
    
    // Static assets - Cache First, fallback to network
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(STATIC_CACHE).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            }).catch(() => {
                // Return offline page for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('/offline.html');
                }
                return new Response('Offline - Content not available', { status: 404 });
            })
        );
        return;
    }
    
    // Default - Network First
    event.respondWith(
        fetch(event.request).catch(async () => {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }
            if (event.request.mode === 'navigate') {
                return caches.match('/offline.html');
            }
            return new Response('Offline', { status: 503 });
        })
    );
});

// Push notification support (optional)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: '/vite.svg',
                badge: '/vite.svg',
                data: data.url
            })
        );
    }
});

// Notification click handler - FIXED: use self.clients instead of clients
self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.notification.data) {
        event.waitUntil(
            self.clients.openWindow(event.notification.data)
        );
    }
});