import { getMessaging, getToken } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, app } from '../firebase/config';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Fordert die Push-Berechtigung an und speichert das FCM Token im UserProfile
 */
export const requestAndSavePushToken = async (userId: string): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return false;
    }

    if (!('serviceWorker' in navigator)) {
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
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Entzieht das Push-Token im UserProfile
 */
export const disablePushNotifications = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      fcmToken: null,
      'notificationSettings.enabled': false,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    // Stille Fehlerbehandlung
  }
};

/**
 * Ruft die sichere Cloud Function 'sendPushNotification' auf, 
 * um eine Push-Benachrichtigung an ein geschlossenes Gerät zu senden.
 */
export const sendDirectPushNotification = async ({
  targetUserId,
  title,
  body,
  link,
}: {
  targetUserId: string;
  title: string;
  body: string;
  link?: string;
}): Promise<void> => {
  try {
    const functions = getFunctions(app, 'europe-west1'); // Passe die Region bei Bedarf an
    const sendPush = httpsCallable(functions, 'sendPushNotification');

    await sendPush({
      targetUserId,
      title,
      body,
      link: link || '/',
    });
  } catch (err) {
    // Stille Fehlerbehandlung
  }
};