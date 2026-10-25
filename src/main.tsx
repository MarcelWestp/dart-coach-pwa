import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// NEU: Service Worker auf localhost und PWA registrieren
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((reg) => {
        console.log('Firebase SW erfolgreich registriert:', reg);
      })
      .catch((err) => {
        console.error('Fehler bei SW Registrierung:', err);
      });
  });
}