// Berechnet Kalenderwoche und Jahr basierend auf ISO-8601 (Donnerstag-Regel)
export const getWeekAndYearFromDate = (dateString: string) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return { year: now.getFullYear(), calendarWeek: 1 };
  }

  // Kopie erstellen und auf den nächsten Donnerstag setzen
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);

  // Der erste Donnerstag des Jahres definiert die KW 1
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const dayDiff = (target.getTime() - firstThursday.getTime()) / 86400000;
  
  const calendarWeek = 1 + Math.round((dayDiff - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  
  return {
    year: target.getFullYear(),
    calendarWeek,
  };
};