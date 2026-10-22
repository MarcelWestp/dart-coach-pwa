import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  ChallengeDifficulty,
  ChallengeTask,
  UserMonthlyChallenge,
  PlayerChallengeTask,
  ChallengeLeaderboardEntry,
} from '../types/challenge';

const COLLECTION_POOL = 'challengePool';
const COLLECTION_USER_CHALLENGES = 'userMonthlyChallenges';

// Hilfsfunktion: Berechnet den aktuellen Monat im Format "YYYY-MM"
export const getCurrentMonthYear = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

// Hilfsfunktion: Berechnet den Vormonat im Format "YYYY-MM"
export const getPreviousMonthYear = (monthYearStr: string): string => {
  const [yearStr, monthStr] = monthYearStr.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1;

  if (month === 0) {
    month = 12;
    year -= 1;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
};

// Hilfsfunktion: Berechnet die benötigten Tage (jeder angebrochene Tag zählt als ganzer Tag)
export const calculateDaysNeeded = (startDateStr: string, completedDateStr: string): number => {
  const start = new Date(startDateStr).getTime();
  const completed = new Date(completedDateStr).getTime();

  const diffInMs = completed - start;
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  // Angebrochener Tag = ganzer Tag (mindestens 1 Tag)
  return Math.max(1, Math.ceil(diffInDays));
};

// ==========================================
// ADMIN POOL-VERWALTUNG
// ==========================================

export const getChallengePool = async (difficulty?: ChallengeDifficulty): Promise<ChallengeTask[]> => {
  try {
    let q;
    if (difficulty) {
      q = query(collection(db, COLLECTION_POOL), where('difficulty', '==', difficulty));
    } else {
      q = query(collection(db, COLLECTION_POOL));
    }

    const snap = await getDocs(q);
    const tasks: ChallengeTask[] = [];
    snap.forEach((d) => {
      tasks.push({ id: d.id, ...d.data() } as ChallengeTask);
    });
    return tasks;
  } catch (error) {
    console.error('Fehler beim Laden des Challenge-Pools:', error);
    throw error;
  }
};

export const addChallengeTask = async (
  task: Omit<ChallengeTask, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION_POOL), {
    ...task,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateChallengeTask = async (
  taskId: string,
  task: Partial<Omit<ChallengeTask, 'id' | 'createdAt'>>
): Promise<void> => {
  const docRef = doc(db, COLLECTION_POOL, taskId);
  await updateDoc(docRef, {
    ...task,
    updatedAt: new Date().toISOString(),
  });
};

export const deleteChallengeTask = async (taskId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_POOL, taskId);
  await deleteDoc(docRef);
};

// ==========================================
// SPIELER CHALLENGE-LOGIK
// ==========================================

// Holt die Challenge-Karte des Spielers für den angegebenen Monat
export const getUserMonthlyChallenge = async (
  userId: string,
  monthYear: string = getCurrentMonthYear()
): Promise<UserMonthlyChallenge | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_USER_CHALLENGES),
      where('userId', '==', userId),
      where('monthYear', '==', monthYear)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    const firstDoc = snap.docs[0];
    return { id: firstDoc.id, ...firstDoc.data() } as UserMonthlyChallenge;
  } catch (error) {
    console.error('Fehler beim Laden der Spieler-Challenge:', error);
    throw error;
  }
};

// Startet eine neue Challenge für den aktuellen Monat
export const startUserMonthlyChallenge = async (
  userId: string,
  difficulty: ChallengeDifficulty,
  monthYear: string = getCurrentMonthYear()
): Promise<UserMonthlyChallenge> => {
  // 1. Prüfen, ob bereits eine Karte existiert
  const existing = await getUserMonthlyChallenge(userId, monthYear);
  if (existing) {
    return existing;
  }

  // 2. Verfügbare Aufgaben aus dem Pool laden
  const poolTasks = await getChallengePool(difficulty);
  if (poolTasks.length < 7) {
    throw new Error(
      `Es sind nicht genügend Aufgaben in der Stufe '${difficulty}' vorhanden (mindestens 7 erforderlich, aktuell: ${poolTasks.length}).`
    );
  }

  // 3. Vormonats-Challenge prüfen, um Wiederholungen zu vermeiden
  const prevMonthYear = getPreviousMonthYear(monthYear);
  const prevChallenge = await getUserMonthlyChallenge(userId, prevMonthYear);

  let excludedTaskIds: string[] = [];
  if (prevChallenge && prevChallenge.difficulty === difficulty) {
    excludedTaskIds = prevChallenge.tasks.map((t) => t.taskId);
  }

  // Filter: Aufgaben ausschließen, die im Vormonat dran waren (falls genügend Alternativen im Pool sind)
  let eligibleTasks = poolTasks.filter((t) => !excludedTaskIds.includes(t.id));
  if (eligibleTasks.length < 7) {
    eligibleTasks = poolTasks; // Fallback, falls der Pool zu klein ist
  }

  // 4. Zufällig 7 Aufgaben auswählen
  const shuffled = [...eligibleTasks].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 7);

  const playerTasks: PlayerChallengeTask[] = selected.map((t) => ({
    taskId: t.id,
    title: t.title,
    description: t.description,
    completed: false,
  }));

  const now = new Date().toISOString();
  const challengeData: Omit<UserMonthlyChallenge, 'id'> = {
    userId,
    monthYear,
    difficulty,
    tasks: playerTasks,
    swapsRemaining: 2,
    swappedTaskIds: [],
    startDate: now,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(collection(db, COLLECTION_USER_CHALLENGES), challengeData);
  return { id: docRef.id, ...challengeData };
};

// Abhaken / Aufheben einer Aufgabe
export const toggleTaskCompletion = async (
  challengeId: string,
  taskId: string
): Promise<UserMonthlyChallenge> => {
  const challengeRef = doc(db, COLLECTION_USER_CHALLENGES, challengeId);
  const snap = await getDoc(challengeRef);

  if (!snap.exists()) {
    throw new Error('Challenge-Karte nicht gefunden.');
  }

  const challenge = { id: snap.id, ...snap.data() } as UserMonthlyChallenge;
  const now = new Date().toISOString();

  let taskToUpdate = challenge.tasks.find((t) => t.taskId === taskId);
  if (!taskToUpdate) {
    throw new Error('Aufgabe nicht auf der Karte gefunden.');
  }

  // Update status
  const isNowCompleted = !taskToUpdate.completed;

  const updatedTasks = challenge.tasks.map((t) => {
    if (t.taskId === taskId) {
      return {
        ...t,
        completed: isNowCompleted,
        completedAt: isNowCompleted ? now : undefined,
      };
    }
    return t;
  });

  const allCompleted = updatedTasks.every((t) => t.completed);

  let completedAt = challenge.completedAt;
  let daysNeeded = challenge.daysNeeded;

  if (allCompleted) {
    completedAt = now;
    daysNeeded = calculateDaysNeeded(challenge.startDate, completedAt);
  } else {
    completedAt = undefined;
    daysNeeded = undefined;
  }

  const updateData = {
    tasks: updatedTasks,
    completedAt,
    daysNeeded,
    updatedAt: now,
  };

  await updateDoc(challengeRef, updateData);

  return {
    ...challenge,
    ...updateData,
  };
};

// Joker / Neuwahl einer Aufgabe (1 von 7 tauschen)
export const swapChallengeTask = async (
  challengeId: string,
  taskIdToSwap: string
): Promise<UserMonthlyChallenge> => {
  const challengeRef = doc(db, COLLECTION_USER_CHALLENGES, challengeId);
  const snap = await getDoc(challengeRef);

  if (!snap.exists()) {
    throw new Error('Challenge-Karte nicht gefunden.');
  }

  const challenge = { id: snap.id, ...snap.data() } as UserMonthlyChallenge;

  if (challenge.swapsRemaining <= 0) {
    throw new Error('Du hast keine Neuwahl-Joker mehr übrig.');
  }

  const taskToSwap = challenge.tasks.find((t) => t.taskId === taskIdToSwap);
  if (!taskToSwap) {
    throw new Error('Aufgabe nicht auf der Karte gefunden.');
  }

  if (taskToSwap.completed) {
    throw new Error('Abgeschlossene Aufgaben können nicht neu gewählt werden.');
  }

  // Pool für diese Stufe laden
  const poolTasks = await getChallengePool(challenge.difficulty);

  // Aktuelle IDs auf der Karte & bereits getauschte IDs
  const currentTaskIdsOnCard = challenge.tasks.map((t) => t.taskId);

  // Mögliche Kandidaten (noch nicht auf der Karte)
  const availableCandidates = poolTasks.filter((t) => !currentTaskIdsOnCard.includes(t.id));

  if (availableCandidates.length === 0) {
    throw new Error('Keine weiteren verfügbaren Aufgaben im Pool vorhanden.');
  }

  // Neue Aufgabe zufällig wählen
  const newTask = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];

  const updatedTasks = challenge.tasks.map((t) => {
    if (t.taskId === taskIdToSwap) {
      return {
        taskId: newTask.id,
        title: newTask.title,
        description: newTask.description,
        completed: false,
        isSwapped: true,
      };
    }
    return t;
  });

  const now = new Date().toISOString();
  const updateData = {
    tasks: updatedTasks,
    swapsRemaining: challenge.swapsRemaining - 1,
    swappedTaskIds: [...(challenge.swappedTaskIds || []), taskIdToSwap],
    updatedAt: now,
  };

  await updateDoc(challengeRef, updateData);

  return {
    ...challenge,
    ...updateData,
  };
};

// ==========================================
// RANGLISTE / LEADERBOARD
// ==========================================

export const getMonthlyChallengeLeaderboard = async (
  difficulty: ChallengeDifficulty,
  monthYear: string = getCurrentMonthYear(),
  userProfiles: Record<string, { displayName: string; photoURL?: string; activeTitle?: string }>
): Promise<ChallengeLeaderboardEntry[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_USER_CHALLENGES),
      where('monthYear', '==', monthYear),
      where('difficulty', '==', difficulty)
    );

    const snap = await getDocs(q);
    const entries: ChallengeLeaderboardEntry[] = [];

    snap.forEach((d) => {
      const data = d.data() as UserMonthlyChallenge;
      // Nur abgeschlossene Challenges (alle 7 Aufgaben erledigt)
      if (data.completedAt && data.daysNeeded) {
        const userProf = userProfiles[data.userId];
        entries.push({
          userId: data.userId,
          userDisplayName: userProf?.displayName || 'Anonymer Spieler',
          userPhotoURL: userProf?.photoURL,
          activeTitle: userProf?.activeTitle,
          monthYear: data.monthYear,
          difficulty: data.difficulty,
          startDate: data.startDate,
          completedDate: data.completedAt,
          daysNeeded: data.daysNeeded,
        });
      }
    });

    // Sortierung nach den vereinbarten Regeln:
    // 1. Wenigste benötigte Tage
    // 2. Tie-breaker: Wer zeitlich früher im Monat abgeschlossen hat
    return entries.sort((a, b) => {
      if (a.daysNeeded !== b.daysNeeded) {
        return a.daysNeeded - b.daysNeeded;
      }
      return new Date(a.completedDate).getTime() - new Date(b.completedDate).getTime();
    });
  } catch (error) {
    console.error('Fehler beim Laden der Challenge-Rangliste:', error);
    throw error;
  }
};