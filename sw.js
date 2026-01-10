// Service Worker for Caching Application Shell

const CACHE_NAME = 'sandypetshop-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  '/App.tsx',
  '/constants.ts',
  '/types.ts',
  '/supabaseClient.ts',
  'https://i.imgur.com/M3Gt3OA.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Rochester&display=swap',
  'https://static.thenounproject.com/png/pet-icon-6939415-512.png',
  'https://static.thenounproject.com/png/profile-icon-709597-512.png',
  'https://static.thenounproject.com/png/whatsapp-icon-6592278-512.png',
  'https://static.thenounproject.com/png/pet-icon-7326432-512.png',
  'https://static.thenounproject.com/png/location-icon-7979305-512.png'
];

// Install event: cache the application assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: serve from cache, falling back to network
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests for our assets.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response from cache
        if (response) {
          return response;
        }

        // Not in cache - fetch from network
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response to cache
            // Don't cache Supabase API requests, only our app shell assets.
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});