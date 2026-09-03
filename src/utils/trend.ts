export type TrendLevel = 
  | 'strongly_increasing' 
  | 'increasing' 
  | 'stable' 
  | 'decreasing' 
  | 'strongly_decreasing';

export interface TrendResult {
  level: TrendLevel;
  label: string;
  color: 'success' | 'info' | 'warning' | 'error';
  percentageChange: number;
}

export const calculateTrend = (scores: number[]): TrendResult => {
  if (scores.length < 2) {
    return {
      level: 'stable',
      label: 'Gleichbleibend',
      color: 'info',
      percentageChange: 0,
    };
  }

  // Neueste Ergebnisse zuerst
  const recentCount = Math.min(3, Math.floor(scores.length / 2) || 1);
  const recentScores = scores.slice(-recentCount);
  const previousScores = scores.slice(0, scores.length - recentCount);

  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const previousAvg = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;

  if (previousAvg === 0) {
    return {
      level: 'stable',
      label: 'Gleichbleibend',
      color: 'info',
      percentageChange: 0,
    };
  }

  const change = ((recentAvg - previousAvg) / previousAvg) * 100;

  if (change >= 15) {
    return { level: 'strongly_increasing', label: 'Stark steigend', color: 'success', percentageChange: Math.round(change) };
  } else if (change >= 5) {
    return { level: 'increasing', label: 'Steigend', color: 'success', percentageChange: Math.round(change) };
  } else if (change > -5) {
    return { level: 'stable', label: 'Gleichbleibend', color: 'info', percentageChange: Math.round(change) };
  } else if (change > -15) {
    return { level: 'decreasing', label: 'Fallend', color: 'warning', percentageChange: Math.round(change) };
  } else {
    return { level: 'strongly_decreasing', label: 'Stark fallend', color: 'error', percentageChange: Math.round(change) };
  }
};