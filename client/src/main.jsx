import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 secondi
    },
  },
});

// Carica tema salvato all'avvio
const savedSettings = localStorage.getItem('userSettings');
const root = document.documentElement;

// Rimuovi sempre dark class prima di applicare
root.classList.remove('dark');

if (savedSettings) {
  try {
    const { themeColor, secondaryColor, themeMode } = JSON.parse(savedSettings);
    
    // Applica colore principale
    if (themeColor) {
      root.setAttribute('data-theme', themeColor);
    } else {
      root.setAttribute('data-theme', 'blue');
    }
    
    // Applica colore secondario
    if (secondaryColor) {
      root.setAttribute('data-secondary', secondaryColor);
    } else {
      root.setAttribute('data-secondary', 'slate');
    }
    
    // Applica tema chiaro/scuro
    let isDark = themeMode === 'dark';
    if (themeMode === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    if (isDark) {
      root.classList.add('dark');
    }
    root.setAttribute('data-mode', isDark ? 'dark' : 'light');
  } catch (e) {
    // Default: tema chiaro
    root.setAttribute('data-theme', 'blue');
    root.setAttribute('data-secondary', 'slate');
    root.setAttribute('data-mode', 'light');
  }
} else {
  // Nessuna impostazione salvata: default
  root.setAttribute('data-theme', 'blue');
  root.setAttribute('data-secondary', 'slate');
  root.setAttribute('data-mode', 'light');
}

// Registra service worker per notifiche push
if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.ready.then(registration => {
    console.log('Service Worker ready');
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
