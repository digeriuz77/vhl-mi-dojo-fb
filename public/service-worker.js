// MI-Dojo Service Worker
const CACHE_NAME = 'mi-dojo-cache-v2'; // Updated version number
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/images/dojo-background.jpg',
  '/images/wooden-texture.jpg',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Roboto:wght@300;400;500;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css'
];

// Install event - cache basic assets
self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Cache-busting function for critical assets
function addCacheBuster(url) {
  // Only add cache buster to our own assets, not CDN resources
  if (url.startsWith('/') && !url.includes('?')) {
    return `${url}?v=${CACHE_NAME}`;
  }
  return url;
}

// Fetch event - serve from cache if available, otherwise fetch from network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and Firebase API calls
  if (event.request.method !== 'GET' ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firebaseio.com')) {
    return;
  }

  // For CSS and JS files, always try network first, then fall back to cache
  if (event.request.url.endsWith('.css') || event.request.url.endsWith('.js')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // If network fetch fails, try to return from cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For other assets, check cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request for future use
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for future use
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Handle offline experiences
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate' ||
      (event.request.method === 'GET' &&
       event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
  }
});