import { startOfWeek, differenceInCalendarWeeks, isBefore, endOfWeek } from 'date-fns';

/**
 * Calculates the number of weeks since the launch date using the "Monday Rule".
 * Every Monday marks the beginning of a new week.
 * The week containing the launch date is counted as Week 1.
 * 
 * @param launchDate The date the program started
 * @param targetDate The current date (defaults to now)
 * @returns Number of expected weeks
 */
export const calculateExpectedWeeks = (launchDate: Date | string, targetDate: Date = new Date()): number => {
  const start = new Date(launchDate);
  const end = new Date(targetDate);
  
  if (isBefore(end, start)) return 0;
  
  // Normalize both to the start of their respective weeks (Monday)
  const normalizedStart = startOfWeek(start, { weekStartsOn: 1 }); // 1 = Monday
  const normalizedEnd = startOfWeek(end, { weekStartsOn: 1 });
  
  // differenceInCalendarWeeks returns the number of calendar weeks between two dates.
  // We add 1 because the first week counts.
  const weeks = differenceInCalendarWeeks(normalizedEnd, normalizedStart, { weekStartsOn: 1 }) + 1;
  
  return Math.max(1, weeks);
};

/**
 * Calculates the number of FULLY COMPLETED weeks since launch.
 * A week is completed only after Sunday midnight.
 */
export const calculateCompletedWeeks = (launchDate: Date | string, targetDate: Date = new Date()): number => {
  const start = new Date(launchDate);
  const end = new Date(targetDate);
  
  if (isBefore(end, start)) return 0;
  
  const normalizedStart = startOfWeek(start, { weekStartsOn: 1 });
  const normalizedEnd = startOfWeek(end, { weekStartsOn: 1 });
  
  // The number of weeks that have completely passed before the current week
  const pastWeeks = differenceInCalendarWeeks(normalizedEnd, normalizedStart, { weekStartsOn: 1 });
  
  // We don't add 1 here because the current week (index 'pastWeeks') is still active.
  // Unless we are strictly measuring only full Sunday-to-Sunday blocks.
  return Math.max(0, pastWeeks);
};

/**
 * Calculates which week a specific date falls into, relative to a launch date.
 * Returns an index (0-based) of the week.
 */
export const getWeekIndex = (date: Date | string, launchDate: Date | string): number => {
  const d = new Date(date);
  const start = new Date(launchDate);
  
  const normalizedDateMonday = startOfWeek(d, { weekStartsOn: 1 });
  const normalizedLaunchMonday = startOfWeek(start, { weekStartsOn: 1 });
  
  return differenceInCalendarWeeks(normalizedDateMonday, normalizedLaunchMonday, { weekStartsOn: 1 });
};

/**
 * Gets the number of unique weeks where the total contribution meets or exceeds the required threshold.
 */
export const calculateFullyPaidWeeks = (
  contributions: { amount: number; date: string | Date }[], 
  launchDate: Date | string,
  weeklyThreshold: number
): number => {
  const weeklyTotals: Record<number, number> = {};
  
  contributions.forEach(c => {
    const index = getWeekIndex(c.date, launchDate);
    if (index >= 0) {
       weeklyTotals[index] = (weeklyTotals[index] || 0) + c.amount;
    }
  });
  
  // Count weeks where total matches or exceeds threshold
  return Object.values(weeklyTotals).filter(total => total >= weeklyThreshold).length;
};

/**
 * Calculates the number of weeks without any payment, ONLY considering COMPLETED weeks (past weeks).
 * The current ongoing week is not counted as missed even if it has no payment.
 */
export const calculateMissedWeeks = (
  contributions: { date: string | Date }[],
  launchDate: Date | string
): number => {
  const completedWeeksCount = calculateCompletedWeeks(launchDate);
  if (completedWeeksCount === 0) return 0;

  const paidWeekIndices = new Set<number>();
  contributions.forEach(c => {
    const idx = getWeekIndex(c.date, launchDate);
    if (idx >= 0 && idx < completedWeeksCount) {
      paidWeekIndices.add(idx);
    }
  });

  return Math.max(0, completedWeeksCount - paidWeekIndices.size);
};
