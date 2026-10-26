import {setGlobalOptions} from "firebase-functions/v2";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Globale Optionen für Gen 2 festlegen (z. B. Region und maxInstances)
setGlobalOptions({region: "europe-west1", maxInstances: 10});

// Firebase Admin SDK initialisieren
admin.initializeApp();

/**
 * HTTPS Callable Cloud Function zum gesicherten
 * Versenden von Push-Benachrichtigungen (Gen 2)
 */
export const sendPushNotification = onCall(async (request) => {
  // 1. Sicherheit Check: Ist der Aufrufer in der App angemeldet?
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Der Aufrufer muss authentifiziert sein."
    );
  }

  const {targetUserId, title, body, link} = request.data;

  if (!targetUserId || !title || !body) {
    throw new HttpsError(
      "invalid-argument",
      "Fehlende Parameter: targetUserId, title und body sind erforderlich."
    );
  }

  try {
    // 2. Empfänger-Profil aus Firestore laden, um das fcmToken zu holen
    const userSnap = await admin.firestore()
      .collection("users")
      .doc(targetUserId)
      .get();

    if (!userSnap.exists) {
      return {success: false, reason: "User nicht gefunden."};
    }

    const userData = userSnap.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      return {
        success: false,
        reason: "Kein FCM-Token für diesen User hinterlegt.",
      };
    }

    // 3. Sichere Push-Nachricht über Firebase Admin FCM v1 senden
    const message = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: {
        link: link || "/",
      },
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          icon: "/logo.jpg",
          badge: "/logo.jpg",
        },
      },
    };

    const response = await admin.messaging().send(message);
    return {success: true, messageId: response};
  } catch (error) {
    console.error("Fehler beim Senden:", error);
    throw new HttpsError(
      "internal",
      "Fehler beim Senden der Push-Benachrichtigung."
    );
  }
});