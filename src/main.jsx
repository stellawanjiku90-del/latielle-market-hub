import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Unregister any stale service workers and clear their caches to prevent
// stale JS chunks being served that cause "Cannot read properties of null" hook errors.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  caches.keys().then((cacheNames) => {
    for (const cacheName of cacheNames) {
      caches.delete(cacheName);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
