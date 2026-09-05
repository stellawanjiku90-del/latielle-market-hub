import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import AppErrorBoundary from '@/components/AppErrorBoundary.jsx';
import '@/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('LATIELLE root element was not found.');
}

// Older builds registered a service worker. Remove any legacy registration so
// a stale cached application shell cannot override a fresh production deploy.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  }).catch(() => {});
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
