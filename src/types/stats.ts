export type DateRangeOption = '7days' | '30days' | '90days' | 'thisYear' | 'all';

export interface DateFilter {
  range: DateRangeOption;
  startDate?: Date;
  endDate?: Date;
}

export const getDateRangeBounds = (range: DateRangeOption): { start: Date | null; end: Date } => {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case '7days':
      start.setDate(end.getDate() - 7);
      return { start, end };
    case '30days':
      start.setDate(end.getDate() - 30);
      return { start, end };
    case '90days':
      start.setDate(end.getDate() - 90);
      return { start, end };
    case 'thisYear':
      return { start: new Date(end.getFullYear(), 0, 1), end };
    case 'all':
    default:
      return { start: null, end };
  }
};