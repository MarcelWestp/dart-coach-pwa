import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker auf localhost und PWA registrieren
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then(() => {
        // Registrierung erfolgreich
          console.log('Firebase SW erfolgreich registriert:');
      })
      .catch(() => {
        // Fehler bei der Registrierung abfangen
        console.error('Firebase SW Registrierung fehlgeschlagen: ');
      });
  });
}