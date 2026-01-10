
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from '@/src/components/ui/toast';
import MobileUiDemo from '@/src/pages/MobileUiDemo';

// Proactively remove any existing service workers to avoid stale caches in preview/dev
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  }).catch(() => {});
}

// Safe Service Worker registration: register only in production and only if sw.js exists
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const res = await fetch('/sw.js', { method: 'HEAD' });
      if (!res.ok) return;
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    } catch (error) {
      console.log('ServiceWorker registration skipped:', error);
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const useMobileDemo = window.location.hash === '#mobile-ui-demo'
root.render(
  <React.StrictMode>
    <ToastProvider>
      {useMobileDemo ? <MobileUiDemo /> : <App />}
    </ToastProvider>
  </React.StrictMode>
);
