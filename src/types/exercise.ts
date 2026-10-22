export type ExerciseResultType = 'points' | 'attempts' | 'hits' | 'highestScore';
export type ScoreDirection = 'higher_is_better' | 'lower_is_better';

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
  resultType: ExerciseResultType;
  scoreDirection: ScoreDirection;
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
  exerciseIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestResult {
  id?: string;
  testId?: string;
  exerciseId?: string;
  userId: string;
  assignedByCoachId?: string;
  totalPoints: number;
  playerNote?: string;
  exerciseScores: {
    exerciseId: string;
    points: number;
    details?: Record<string, any>;
  }[];
  completedAt: string;
}