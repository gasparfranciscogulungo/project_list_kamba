/**
 * List Kamba - Service Worker
 * Handles offline functionality, caching, and background sync
 */

const CACHE_NAME = 'list-kamba-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const RUNTIME_CACHE = `${CACHE_NAME}-runtime`;

// Files to cache immediately (App Shell)
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/css/variables.css',
  '/assets/css/base.css',
  '/assets/css/components.css',
  '/assets/css/themes.css',
  '/assets/css/animations.css',
  '/assets/js/utils.js',
  '/assets/js/storage.js',
  '/assets/js/tasks.js',
  '/assets/js/notifications.js',
  '/assets/js/app.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png'
];

// Files to cache dynamically (optional)
const DYNAMIC_FILES = [
  '/pages/tasks.html',
  '/pages/calendar.html',
  '/pages/timer.html',
  '/pages/analytics.html',
  '/pages/settings.html'
];

// Network-first routes (always try network first)
const NETWORK_FIRST_ROUTES = [
  '/api/',
  '/sync/',
  '/analytics/'
];

// Cache-first routes (serve from cache, fallback to network)
const CACHE_FIRST_ROUTES = [
  '/assets/',
  '/icons/',
  '/images/',
  '/sounds/'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[Service Worker] Caching static files');
        return cache.addAll(STATIC_FILES);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.includes('list-kamba') && cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Determine caching strategy based on route
  if (isStaticFile(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else if (isNetworkFirstRoute(url.pathname)) {
    event.respondWith(networkFirst(request));
  } else if (isCacheFirstRoute(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Caching strategies
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[Service Worker] Cache-first failed:', error);
    return handleOfflineRequest(request);
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[Service Worker] Network-first failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return handleOfflineRequest(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.warn('[Service Worker] Background fetch failed:', error);
  });
  
  // Return cached version immediately, or wait for network
  return cachedResponse || fetchPromise || handleOfflineRequest(request);
}

// Handle offline requests
async function handleOfflineRequest(request) {
  const url = new URL(request.url);
  
  // For navigation requests, return the app shell
  if (request.mode === 'navigate') {
    const cache = await caches.open(STATIC_CACHE);
    return cache.match('/index.html') || cache.match('/');
  }
  
  // For API requests, return offline response
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'Você está offline. Os dados serão sincronizados quando a conexão for restaurada.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  // Return offline page or generic error
  return new Response(
    `<!DOCTYPE html>
    <html lang="pt-AO">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - List Kamba</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center; 
          padding: 40px; 
          background: #f5f5f5; 
        }
        .offline-message { 
          max-width: 400px; 
          margin: 0 auto; 
          background: white; 
          padding: 40px; 
          border-radius: 12px; 
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .offline-icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #2F5F8F; margin-bottom: 16px; }
        p { color: #666; line-height: 1.6; }
        button { 
          background: #2F5F8F; 
          color: white; 
          border: none; 
          padding: 12px 24px; 
          border-radius: 6px; 
          cursor: pointer; 
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="offline-message">
        <div class="offline-icon">📱</div>
        <h1>Você está offline</h1>
        <p>Não foi possível carregar esta página. Verifique sua conexão com a internet e tente novamente.</p>
        <p>O List Kamba funciona offline para a maioria das funcionalidades!</p>
        <button onclick="window.location.reload()">Tentar Novamente</button>
      </div>
    </body>
    </html>`,
    {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

// Helper functions
function isStaticFile(pathname) {
  return STATIC_FILES.some(file => file === pathname);
}

function isNetworkFirstRoute(pathname) {
  return NETWORK_FIRST_ROUTES.some(route => pathname.startsWith(route));
}

function isCacheFirstRoute(pathname) {
  return CACHE_FIRST_ROUTES.some(route => pathname.startsWith(route));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
  
  if (event.tag === 'sync-analytics') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncTasks() {
  try {
    console.log('[Service Worker] Syncing tasks...');
    
    // Get tasks from IndexedDB that need syncing
    const tasks = await getTasksToSync();
    
    if (tasks.length === 0) {
      console.log('[Service Worker] No tasks to sync');
      return;
    }
    
    // Attempt to sync each task
    for (const task of tasks) {
      try {
        await syncTask(task);
        await markTaskAsSynced(task.id);
      } catch (error) {
        console.error('[Service Worker] Failed to sync task:', task.id, error);
      }
    }
    
    // Notify app about sync completion
    await notifyClients('tasks-synced', { count: tasks.length });
    
  } catch (error) {
    console.error('[Service Worker] Task sync failed:', error);
  }
}

async function syncAnalytics() {
  try {
    console.log('[Service Worker] Syncing analytics...');
    
    // Get analytics events that need syncing
    const events = await getAnalyticsToSync();
    
    if (events.length === 0) {
      console.log('[Service Worker] No analytics to sync');
      return;
    }
    
    // Batch sync analytics events
    await syncAnalyticsEvents(events);
    await markAnalyticsAsSynced(events.map(e => e.id));
    
    console.log('[Service Worker] Analytics synced:', events.length, 'events');
    
  } catch (error) {
    console.error('[Service Worker] Analytics sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do List Kamba',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-72x72.png',
    tag: 'list-kamba-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Abrir App',
        icon: '/assets/icons/action-open.png'
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: '/assets/icons/action-dismiss.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('List Kamba', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clients) => {
        // If app is already open, focus it
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Message handling from main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(cacheUrls(data.urls));
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCaches());
      break;
      
    case 'GET_CACHE_SIZE':
      event.waitUntil(getCacheSize().then(size => {
        event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
      }));
      break;
  }
});

// Utility functions for message handling
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        await cache.put(url, response);
      }
    } catch (error) {
      console.warn('[Service Worker] Failed to cache URL:', url, error);
    }
  }
}

async function clearCaches() {
  const cacheNames = await caches.keys();
  
  return Promise.all(
    cacheNames
      .filter(name => name.includes('list-kamba'))
      .map(name => caches.delete(name))
  );
}

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    if (cacheName.includes('list-kamba')) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
  }
  
  return totalSize;
}

// Notify all clients
async function notifyClients(type, data) {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({ type, data });
  });
}

// IndexedDB operations for sync
async function getTasksToSync() {
  // This would typically read from IndexedDB
  // For now, return empty array as we don't have server sync
  return [];
}

async function syncTask(task) {
  // This would sync with a server
  // For now, just log the action
  console.log('[Service Worker] Would sync task:', task.id);
}

async function markTaskAsSynced(taskId) {
  // Mark task as synced in IndexedDB
  console.log('[Service Worker] Task synced:', taskId);
}

async function getAnalyticsToSync() {
  // This would get analytics events from IndexedDB
  return [];
}

async function syncAnalyticsEvents(events) {
  // This would send analytics to server
  console.log('[Service Worker] Would sync analytics:', events.length, 'events');
}

async function markAnalyticsAsSynced(eventIds) {
  // Mark analytics as synced
  console.log('[Service Worker] Analytics synced:', eventIds.length, 'events');
}

// Performance monitoring
self.addEventListener('fetch', (event) => {
  const start = performance.now();
  
  event.respondWith(
    (async () => {
      const response = await handleFetch(event);
      const duration = performance.now() - start;
      
      // Log slow requests
      if (duration > 1000) {
        console.warn('[Service Worker] Slow request:', event.request.url, `${duration}ms`);
      }
      
      return response;
    })()
  );
});

async function handleFetch(event) {
  // Use the existing fetch logic
  return fetch(event.request);
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[Service Worker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] Unhandled rejection:', event.reason);
});

console.log('[Service Worker] Loaded successfully');