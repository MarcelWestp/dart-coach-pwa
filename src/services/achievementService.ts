import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type {
  DynamicAchievement,
  UserAchievementProgress,
  AchievementTier,
} from "../types/achievement";
import type { Exercise } from "../types/exercise";
import { sendNotificationIfEnabled } from "./notificationService";

/**
 * Prüft und aktualisiert den Achievement-Fortschritt eines Spielers.
 * Wenn neue Stufen erreicht werden, vergibt die Funktion XP sowie freigeschaltete Titel als Belohnung.
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

    // Optional: Falls eine spezifische Übung beteiligt ist, deren scoreDirection laden
    let exerciseDirection: "higher_is_better" | "lower_is_better" = "higher_is_better";
    if (contextData?.exerciseId) {
      const exDoc = await getDoc(doc(db, "exercises", contextData.exerciseId));
      if (exDoc.exists()) {
        const exData = exDoc.data() as Exercise;
        if (exData.scoreDirection) {
          exerciseDirection = exData.scoreDirection;
        }
      }
    }

    // 2. Aktuellen Wert des Spielers ermitteln
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
    } else if (triggerType === "exercise_highscore" && contextData?.score !== undefined) {
      currentValue = contextData.score;
    }

    // 3. Jedes zutreffende Achievement prüfen
    for (const achDoc of achSnap.docs) {
      const ach = { id: achDoc.id, ...achDoc.data() } as DynamicAchievement;

      // Falls eine spezifische Übung verknüpft ist, aber nicht übereinstimmt, überspringen
      if (ach.exerciseId && contextData?.exerciseId && ach.exerciseId !== contextData.exerciseId) {
        continue;
      }

      // Aktuellen User-Fortschritt laden
      const userAchRef = doc(db, `users/${userId}/achievements`, ach.id);
      const userAchSnap = await getDoc(userAchRef);
      const existingProg = userAchSnap.exists()
        ? (userAchSnap.data() as UserAchievementProgress)
        : { userId, achievementId: ach.id, currentValue: 0, unlockedTiers: [] };

      // Für Highscores den echten Bestwert behalten (je nach Wertungsrichtung)
      let newValue = currentValue;
      if (triggerType === "exercise_highscore") {
        const prevValue = existingProg.currentValue || 0;
        if (prevValue > 0) {
          newValue = exerciseDirection === "lower_is_better"
            ? Math.min(prevValue, currentValue)
            : Math.max(prevValue, currentValue);
        }
      }

      const newlyUnlockedTiers: AchievementTier[] = [...(existingProg.unlockedTiers || [])];
      const newTitlesToGrant: string[] = [];
      let hasNewUnlock = false;

      // Prüfen, welche neuen Stufen erreicht wurden
      for (const req of ach.requirements || []) {
        const isReached = exerciseDirection === "lower_is_better"
          ? newValue <= req.threshold
          : newValue >= req.threshold;

        if (isReached && !newlyUnlockedTiers.includes(req.tier)) {
          newlyUnlockedTiers.push(req.tier);
          hasNewUnlock = true;

          // Falls eine Belohnung in Form eines Titels hinterlegt ist
          if (req.titleReward && req.titleReward.trim() !== "") {
            newTitlesToGrant.push(req.titleReward.trim());
          }
        }
      }

      // 4. In Firestore speichern
      if (newValue !== existingProg.currentValue || hasNewUnlock) {
        await setDoc(userAchRef, {
          userId,
          achievementId: ach.id,
          currentValue: newValue,
          unlockedTiers: newlyUnlockedTiers,
          lastUnlockedAt: hasNewUnlock ? new Date().toISOString() : existingProg.lastUnlockedAt,
        });

        // Falls neue Titel freigeschaltet wurden, diese zum User-Profil hinzufügen
        if (newTitlesToGrant.length > 0) {
          const userRef = doc(db, "users", userId);
          for (const title of newTitlesToGrant) {
            await updateDoc(userRef, {
              unlockedTitles: arrayUnion(title),
            });
          }
        }

        // 5. In-App Benachrichtigung bei neu freigeschalteter Stufe senden
        if (hasNewUnlock) {
          const highestTier = newlyUnlockedTiers[newlyUnlockedTiers.length - 1];
          const titleNotice = newTitlesToGrant.length > 0 
            ? ` Inklusive neuem Profil-Titel: "${newTitlesToGrant.join('", "')}"!` 
            : "";

          await sendNotificationIfEnabled({
            userId,
            type: "achievementUnlocked",
            title: `Neues Achievement freigeschaltet!`,
            message: `Du hast die Stufe "${highestTier.toUpperCase()}" für "${ach.title}" erreicht!${titleNotice}`,
            link: "/achievements",
          });
        }
      }
    }
  } catch (err) {
    console.error("Fehler beim Prüfen und Vergeben der Achievements/Titel:", err);
  }
};