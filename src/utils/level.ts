export interface UserLevelInfo {
  level: number;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

/**
 * Berechnet das dynamische Level aus den Gesamt-XP.
 * Bietet eine unendliche, sanft ansteigende Kurve.
 */
export const calculateUserLevel = (totalXp: number): UserLevelInfo => {
  let level = 1;
  let xpAccumulated = 0;

  while (true) {
    // XP-Bedarf pro Stufe (steigt leicht an)
    const xpNeededForNext = Math.floor(100 * Math.pow(level, 1.25));

    if (totalXp < xpAccumulated + xpNeededForNext) {
      const xpInCurrentLevel = totalXp - xpAccumulated;
      const progressPercent = Math.min(
        100,
        Math.round((xpInCurrentLevel / xpNeededForNext) * 100)
      );

      return {
        level,
        currentXp: totalXp,
        xpForCurrentLevel: xpAccumulated,
        xpForNextLevel: xpAccumulated + xpNeededForNext,
        progressPercent,
      };
    }

    xpAccumulated += xpNeededForNext;
    level++;
  }
};