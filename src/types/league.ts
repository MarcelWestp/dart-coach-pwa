export type LeagueType = 'performance' | 'match';

export interface LeagueConfig {
  id: string;
  title: string;
  description: string;          // Beschreibung der Liga für die Spieler
  type: LeagueType;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  exerciseIds?: string[];        // Vorgegebene Übungen (für Performance League)
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyExerciseConfig {
  id: string;
  exerciseId: string;
  year: number;                 // z. B. 2026
  month: number;                // 1 - 12
  title?: string;
  description?: string;         // Spezifische Beschreibung/Zielsetzung für diesen Monat
  createdBy: string;
  createdAt: string;
}

export interface MatchResult {
  id: string;
  leagueId: string;
  player1Id: string;
  player2Id: string;
  winnerId: string;
  scorePlayer1: number;
  scorePlayer2: number;
  status: "pending" | "confirmed" | "rejected";
  p1RatingBefore?: number;
  p2RatingBefore?: number;
  p1RatingAfter?: number;
  p2RatingAfter?: number;
  playedAt: string;
}

export interface PlayerRating {
  id?: string;
  userId: string;
  leagueId: string;
  rating: number;               // Startwert z. B. 1000
  updatedAt: string;
}