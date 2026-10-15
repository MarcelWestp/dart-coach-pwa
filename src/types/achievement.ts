export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type AchievementTriggerType = 
  | 'total_exercises_count'       // Anzahl aller Übungen
  | 'specific_exercise_count'    // Anzahl einer spezifischen Übung
  | 'exercise_tag_count'         // Anzahl eines spezifischen Übungtags
  | 'exercise_highscore'         // Bestleistung in einer Übung
  | 'league_rank'                // Platzierung in der Liga
  | 'monthly_exercise_rank'      // Platzierung in der Übung des Monats
  | 'training_streak_days'       // Tage/Wochen in Folge trainiert
  | 'matches_played'             // Absolvierte 1v1-Matches
  | 'matches_won';               // Gewonnene 1v1-Matches

export interface AchievementRequirement {
  tier: AchievementTier;
  threshold: number;             // Zielwert (z. B. 100 Übungen, Platz 1, 150 Punkte)
  xpReward: number;              // Punkte für dieses Level
  titleReward?: string; // Optionaler Freischalt-Titel bei Erreichen der Stufe
}

export interface DynamicAchievement {
  id: string;
  title: string;
  description: string;
  iconName: string;               // Icon-Referenz für die UI
  category: 'training' | 'league' | 'social' | 'special';
  triggerType: AchievementTriggerType;
  exerciseId?: string;           // Optional: Falls an spezifische Übung gebunden
  isSecret?: boolean;            // Geheim bis zur Freischaltung?
  requirements: AchievementRequirement[]; // Die 5 Stufen mit Schwellenwerten
  createdAt: string;
  updatedAt: string;
}

export interface UserAchievementProgress {
  userId: string;
  achievementId: string;
  currentValue: number;          // Aktueller Wert des Spielers (z. B. 42 Übungen)
  unlockedTiers: AchievementTier[]; // Bereits freigeschaltete Stufen
  lastUnlockedAt?: string;
}