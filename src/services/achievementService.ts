import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type {
  DynamicAchievement,
  UserAchievementProgress,
  AchievementTier,
} from "../types/achievement";
import { sendNotificationIfEnabled } from "./notificationService";

/**
 * Prüft und aktualisiert den Achievement-Fortschritt eines Spielers.
 * Sollte aufgerufen werden, wenn ein Spieler eine Übung absolviert oder ein Match austrägt.
 */
export const triggerAchievementCheck = async (
  userId: string,
  triggerType: string,
  contextData?: { exerciseId?: string; score?: number }
) => {
  try {
    // 1. Alle aktiven Achievements für diesen Trigger-Typ aus Firestore holen
    const achSnap = await getDocs(
      query(collection(db, "achievements"), where("triggerType", "==", triggerType))
    );

    if (achSnap.empty) return;

    // 2. Aktuelle Daten des Spielers ermitteln (z. B. Anzahl aller Testergebnisse)
    let currentValue = 0;

    if (triggerType === "total_exercises_count") {
      const resultsSnap = await getDocs(
        query(collection(db, "testResults"), where("userId", "==", userId))
      );
      currentValue = resultsSnap.size;
    } else if (triggerType === "specific_exercise_count" && contextData?.exerciseId) {
      const resultsSnap = await getDocs(
        query(
          collection(db, "testResults"),
          where("userId", "==", userId),
          where("exerciseId", "==", contextData.exerciseId)
        )
      );
      currentValue = resultsSnap.size;
    } else if (triggerType === "exercise_highscore" && contextData?.score) {
      currentValue = contextData.score;
    }

    // 3. Jedes zutreffende Achievement durchgehen und den Fortschritt vergleichen
    for (const achDoc of achSnap.docs) {
      const ach = { id: achDoc.id, ...achDoc.data() } as DynamicAchievement;

      // Falls spezifische Übung verknüpft ist, aber nicht übereinstimmt, überspringen
      if (ach.exerciseId && contextData?.exerciseId && ach.exerciseId !== contextData.exerciseId) {
        continue;
      }

      // Aktuellen User-Fortschritt laden
      const userAchRef = doc(db, `users/${userId}/achievements`, ach.id);
      const userAchSnap = await getDoc(userAchRef);
      const existingProg = userAchSnap.exists()
        ? (userAchSnap.data() as UserAchievementProgress)
        : { userId, achievementId: ach.id, currentValue: 0, unlockedTiers: [] };

      // Für Highscores den Maximalwert behalten, sonst aktuellen Zähler setzen
      const newValue = triggerType === "exercise_highscore"
        ? Math.max(existingProg.currentValue || 0, currentValue)
        : currentValue;

      // Prüfen, welche neuen Stufen freigeschaltet wurden
      const newlyUnlockedTiers: AchievementTier[] = [...(existingProg.unlockedTiers || [])];
      let hasNewUnlock = false;

      for (const req of ach.requirements || []) {
        if (newValue >= req.threshold && !newlyUnlockedTiers.includes(req.tier)) {
          newlyUnlockedTiers.push(req.tier);
          hasNewUnlock = true;
        }
      }

      // 4. In Firestore aktualisieren, wenn sich der Wert oder die Stufen geändert haben
      if (newValue !== existingProg.currentValue || hasNewUnlock) {
        await setDoc(userAchRef, {
          userId,
          achievementId: ach.id,
          currentValue: newValue,
          unlockedTiers: newlyUnlockedTiers,
          lastUnlockedAt: hasNewUnlock ? new Date().toISOString() : existingProg.lastUnlockedAt,
        });

        // In-App Benachrichtigung bei neuer Stufe senden
        if (hasNewUnlock) {
          const highestTier = newlyUnlockedTiers[newlyUnlockedTiers.length - 1];
          await sendNotificationIfEnabled({
            userId,
            type: "achievementUnlocked",
            title: `🏆 Neues Achievement freigeschaltet!`,
            message: `Du hast die Stufe "${highestTier.toUpperCase()}" für "${ach.title}" erreicht!`,
            link: "/achievements",
          });
        }
      }
    }
  } catch (err) {
    console.error("Fehler beim Prüfen der Achievements:", err);
  }
};