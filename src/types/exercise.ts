export type ExerciseType = 'scoring' | 'check' | 'rules' | 'technique';

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  instructions?: string;
  type: ExerciseType;
  tagIds: string[];
  createdBy: string;
  isSystemStandard: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PerformanceTest {
  id: string;
  title: string;
  description: string;
  exerciseType: ExerciseType;
  exerciseIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  id?: string;
  testId?: string;
  exerciseId?: string; // Für direkte Übungsergebnisse (z. B. Liga / Übung des Monats)
  userId: string;
  assignedByCoachId?: string;
  exerciseType: ExerciseType;
  totalPoints: number;
  playerNote?: string; // Neu: Optionale Notiz/Anmerkung des Spielers
  exerciseScores: {
    exerciseId: string;
    points: number;
    details?: Record<string, any>;
  }[];
  completedAt: string;
}