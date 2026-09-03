import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { UserProfile } from '../types/user';

export type NotificationType = 
  | 'newOrUpdatedTrainingPlans'
  | 'newOrUpdatedPerformanceTest'
  | 'monthlyExerciseHighscore'
  | 'trainingPlanReminder';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Prüft die NotificationSettings des Users und speichert eine In-App-Benachrichtigung
 */
export const sendNotificationIfEnabled = async ({
  userId,
  type,
  title,
  message,
  link,
}: SendNotificationParams): Promise<boolean> => {
  try {
    // 1. UserProfile aus Firestore laden
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;

    const userProfile = userDoc.data() as UserProfile;
    const settings = userProfile.notificationSettings;

    // 2. Prüfung: Sind Benachrichtigungen grundsätzlich oder für den spezifischen Typ erlaubt?
    if (!settings || !settings.enabled) {
      return false; // Benachrichtigungen global deaktiviert
    }

    if (type !== 'trainingPlanReminder' && !settings[type]) {
      return false; // Spezifischer Typ vom User deaktiviert
    }

    if (type === 'trainingPlanReminder' && !settings.trainingPlanReminder) {
      return false; // Erinnerung vor Ablauf deaktiviert
    }

    // 3. Benachrichtigung in Firestore 'notifications'-Collection anlegen (In-App Feed)
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      message,
      link: link || '',
      read: false,
      createdAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error('Fehler beim Senden der Benachrichtigung:', error);
    return false;
  }
};