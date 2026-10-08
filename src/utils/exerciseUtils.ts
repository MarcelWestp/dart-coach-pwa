import type { ExerciseResultType, ScoreDirection } from '../types/exercise';

// 1. Bezeichnung für die Eingabefelder und Tabellen
export const getResultTypeLabel = (resultType?: ExerciseResultType): string => {
  switch (resultType) {
    case 'attempts':
      return 'Benötigte Versuche / Darts';
    case 'hits':
      return 'Anzahl Treffer';
    case 'highestScore':
      return 'Höchstes Ergebnis';
    case 'points':
    default:
      return 'Erzielte Punkte';
  }
};

// 2. Prüft, ob ein neues Ergebnis besser ist als das bisherige beste Ergebnis
export const isBetterScore = (
  newScore: number,
  currentBestScore: number | undefined,
  direction: ScoreDirection = 'higher_is_better'
): boolean => {
  if (currentBestScore === undefined || currentBestScore === null) return true;

  if (direction === 'lower_is_better') {
    return newScore < currentBestScore;
  }
  return newScore > currentBestScore;
};