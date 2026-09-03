import type { Exercise } from './exercise';

export interface BlockExercise {
  exerciseId: string;      // ID der bestehenden Übung aus der Bibliothek
  exercise?: Exercise;     // Optionales aufgelöstes Übungsobjekt für die UI
  coachNote?: string;      // Spezifische Anmerkung des Trainers für diese Übung
  playerNote?: string;     // Notiz/Feedback des Spielers
  completedAt?: string;    // Zeitstempel der Erledigung (für die 48h-Sperrlogik)
  scoreResultId?: string;  // Referenz zum gespeicherten TestResult
}

export interface TrainingBlock {
  id: string;              // Eindeutige ID des Blocks
  title: string;           // Name/Kategorie des Blocks (z. B. "Warm-Up", "Scoring-Block")
  coachNote?: string;      // Anmerkung des Trainers für den gesamten Block
  playerNote?: string;     // Feedback des Spielers für den Block
  exercises: BlockExercise[]; // 1 bis N bestehende Übungen
}

export interface TrainingPlan {
  id?: string;
  title: string;
  coachId?: string;
  playerId?: string;
  year?: number;
  calendarWeek?: number;    // Kalenderwoche (z. B. 37)
  coachNote?: string;      // Notiz des Trainers für den gesamten Plan
  playerNote?: string;     // Notiz/Feedback des Spielers für den gesamten Plan
  coachFeedback?: string;  // Abschluss-Feedback des Trainers nach Fertigstellung
  blocks: TrainingBlock[]; // 1 bis N Blöcke
  performanceTestId?: string; // Maximal 1 Leistungstest pro Woche
  performanceTestCompletedAt?: string;
  status?: 'assigned' | 'in_progress' | 'completed';
  isTemplate?: boolean;
  templateName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CoachPlayerRelation {
  coachId: string;
  playerId: string;
  assignedAt: string;
}