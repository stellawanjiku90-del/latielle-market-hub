import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import AppErrorBoundary from '@/components/AppErrorBoundary.jsx';
import '@/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('LATIELLE root element was not found.');
}

// Register the notification service worker. It does not cache the application
// shell, so deployments always load the current React build.
if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
