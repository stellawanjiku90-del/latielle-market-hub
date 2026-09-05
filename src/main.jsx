import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import AppErrorBoundary from '@/components/AppErrorBoundary.jsx';
import '@/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('LATIELLE root element was not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
