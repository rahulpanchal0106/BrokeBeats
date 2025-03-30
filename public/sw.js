const CACHE_NAME = 'broke-beats-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Resources to cache
const STATIC_RESOURCES = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/download',
  '/components/music-player.tsx',
  '/components/track-list.tsx',
  '/components/ui/button.tsx',
  '/components/ui/slider.tsx',
  '/lib/utils.ts',
  '/styles/globals.css',
  '/placeholder.svg',
  'https://img.freepik.com/premium-photo/illustration-girl-sitting-balcony-with-her-cat-watching-sunset_1260208-167.jpg',
  'https://img.freepik.com/premium-photo/illustration-girl-sitting-balcony-with-her-cat-watching-sunset_1260208-167.jpg?semt=ais_hybrid?height=1080&width=1920&text=Aesthetic+1',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_RESOURCES);
      }),
      caches.open(DYNAMIC_CACHE),
      self.skipWaiting(),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName.startsWith('broke-beats-') &&
                cacheName !== CACHE_NAME &&
                cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE
              );
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      }),
      self.clients.claim(),
    ])
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests except for our API
  if (!url.origin.includes(self.location.origin) && !url.pathname.startsWith('/api/')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      handleApiRequest(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // Handle static resources
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }

      // Clone the request because it can only be used once
      const fetchRequest = event.request.clone();

      // Make network request and cache the response
      return fetch(fetchRequest).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response because it can only be used once
        const responseToCache = response.clone();

        // Cache the fetched response
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If offline and the request is for an HTML page, return offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return null;
      });
    })
  );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    
    // Cache the response
    cache.put(request, networkResponse.clone());
    
    return networkResponse;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache, return offline response
    if (request.url.includes('/api/music')) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
} 