import { getMessaging, getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, app } from '../firebase/config';

export const requestAndSavePushToken = async (userId: string): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      console.warn('Browser unterstützt keine Push-Benachrichtigungen.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Push-Benachrichtigungen wurden vom Nutzer/Browser abgelehnt.');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Kein Service Worker im Browser verfügbar.');
      return false;
    }

    // Registriere oder hole die bestehende Registrierung explizit
    let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    }

    const messaging = getMessaging(app);

    const tokenPromise = getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });

    // 8-Sekunden Timeout-Schutz
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout beim Abrufen des Push-Tokens.')), 8000)
    );

    const currentToken = await Promise.race([tokenPromise, timeoutPromise]);

    if (currentToken) {
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: currentToken,
        'notificationSettings.enabled': true,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } else {
      console.warn('Kein FCM Registration Token empfangen.');
      return false;
    }
  } catch (error) {
    console.error('Fehler beim Anfordern des Push-Tokens:', error);
    return false;
  }
};

export const disablePushNotifications = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmToken: null,
      'notificationSettings.enabled': false,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fehler beim Deaktivieren der Push-Benachrichtigungen:', error);
  }
};