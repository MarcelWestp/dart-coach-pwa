export type ChallengeDifficulty = 'bronze' | 'silver' | 'gold';

// Eine einzelne Aufgabe im Pool
export interface ChallengeTask {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  createdAt: string;
  updatedAt: string;
}

// Status einer zugewiesenen Aufgabe auf lauter Karte des Spielers
export interface PlayerChallengeTask {
  taskId: string;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string | null; // Erlaubt string, undefined oder null für Firestore-Kompatibilität
  isSwapped?: boolean;  // Markierung, falls diese Aufgabe durch einen Joker getauscht wurde
}

// Die monatliche Trainingskarte (Challenge-Card) eines Spielers
export interface UserMonthlyChallenge {
  id?: string;
  userId: string;
  monthYear: string;           // Format: "YYYY-MM" (z. B. "2026-10")
  difficulty: ChallengeDifficulty;
  tasks: PlayerChallengeTask[]; // Exakt 7 Aufgaben
  swapsRemaining: number;      // Startet bei 2 Neuwahl-Jokern
  swappedTaskIds: string[];    // Historie der in diesem Monat getauschten Aufgaben-IDs
  startDate: string;           // ISO-String: Exakter Zeitstempel der Kategoriewahl
  completedAt?: string | null; // ISO-String oder null/undefined
  daysNeeded?: number | null;  // Errechnete benötigte Tage oder null/undefined
  createdAt: string;
  updatedAt: string;
}

// Eintrag in der monatlichen Rangliste für Spieler, die alle 7 Aufgaben absolviert haben
export interface ChallengeLeaderboardEntry {
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  activeTitle?: string;
  monthYear: string;
  difficulty: ChallengeDifficulty;
  startDate: string;
  completedDate: string;
  daysNeeded: number; // Hauptkriterium für die Sortierung (weniger ist besser)
}