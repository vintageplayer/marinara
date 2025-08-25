import { Mutex, withMutex } from '../ui/mutex';
import { PomodoroHistoryStorage } from '../managers/history-storage';
import { HistoryUtils } from '../utils/history-utils';

export interface CountedValue<T> {
  value: T;
  count: number;
}

export interface PomodoroStats {
  daily: number;    // Sessions completed today
  weekly: number;   // Sessions completed this week
  monthly: number;  // Sessions completed this month
  dailyAvg: number;   // Average sessions per day across all history
  weeklyAvg: number;  // Average sessions per week across all history
  monthlyAvg: number; // Average sessions per month across all history
}

export interface PomodoroHistory {
  completion_timestamps: number[];  // Unix timestamps in minutes
  durations: CountedValue<number>[];  // Durations in minutes with count
  timezones: CountedValue<number>[];  // Timezone offset in minutes from UTC with count
  version: number;
}

export interface ImportData {
  durations: number[];  // Array of pairs [count1, value1, count2, value2, ...]
  pomodoros: number[];
  timezones: number[];  // Array of pairs [count1, value1, count2, value2, ...]
  version: number;
}

export interface CsvRow {
  isoDate: string;
  dateStr: string;
  timeStr: string;
  timestamp: number;
  timezoneOffset: number;
  duration: number;
}

// Create singleton instances
const historyMutex = new Mutex();
const historyStorage = new PomodoroHistoryStorage();

/**
 * Creates empty stats object with all counters initialized to zero
 */
const createEmptyStats = (): PomodoroStats => ({
  daily: 0,
  weekly: 0,
  monthly: 0,
  dailyAvg: 0,
  weeklyAvg: 0,
  monthlyAvg: 0
});

/**
 * Processes a timestamp and updates period counters based on when it occurred
 */
const updatePeriodCounters = (
  timestamp: number,
  boundaries: { dayStart: number; weekStart: number; monthStart: number },
  counters: { daily: number; weekly: number; monthly: number },
  history: PomodoroHistory
) => {
  const timezoneOffset = HistoryUtils.findTimezoneOffsetForTimestamp(history, timestamp);
  const adjustedTimestamp = timestamp + timezoneOffset;
  const timestampDate = new Date(timestamp * 60000);
  const timestampMonth = timestampDate.getMonth();
  const currentMonth = new Date().getMonth();

  if (adjustedTimestamp >= boundaries.dayStart) {
    counters.daily++;
    counters.weekly++;
    counters.monthly++;
  } else if (adjustedTimestamp >= boundaries.weekStart) {
    counters.weekly++;
    counters.monthly++;
  } else if (timestampMonth === currentMonth) {
    counters.monthly++;
  } else if (adjustedTimestamp < boundaries.monthStart) {
    return false;
  }
  return true;
};

/**
 * Calculate averages for each time period
 */
const calculateAverages = (
  now: Date,
  boundaries: { dayStart: number; weekStart: number; monthStart: number },
  stats: PomodoroStats,
  history: PomodoroHistory
): void => {
  if (history.completion_timestamps.length === 0) return;

  const uniqueTimestamps = [...new Set(history.completion_timestamps)];
  const totalSessions = uniqueTimestamps.length;
  const oldestTimestamp = uniqueTimestamps[0];
  
  const delta = now.getTime() - (oldestTimestamp * 60000);
  const dayCount = Math.max(delta / (1000 * 60 * 60 * 24), 1);
  const weekCount = Math.max(dayCount / 7, 1);
  const monthCount = Math.max(dayCount / (365.25 / 12), 1);

  stats.dailyAvg = totalSessions / dayCount;
  stats.weeklyAvg = totalSessions / weekCount;
  stats.monthlyAvg = totalSessions / monthCount;
};

/**
 * Get historical stats for completed pomodoros
 */
export async function getHistoricalStats(): Promise<PomodoroStats> {
  return await withMutex(historyMutex, async () => {
    const history = await historyStorage.loadHistory();
    if (history.completion_timestamps.length === 0) {
      return createEmptyStats();
    }

    const uniqueTimestamps = [...new Set(history.completion_timestamps)].sort((a, b) => a - b);
    const uniqueHistory: PomodoroHistory = {
      ...history,
      completion_timestamps: uniqueTimestamps
    };

    const now = new Date();
    const periodBoundaries = HistoryUtils.getTimePeriodBoundaries(now);
    const stats = createEmptyStats();
    
    let currentDurationIndex = 0;
    let sessionsRemainingForDuration = 0;

    for (let i = uniqueHistory.completion_timestamps.length - 1; i >= 0; i--) {
      if (sessionsRemainingForDuration === 0) {
        if (currentDurationIndex >= uniqueHistory.durations.length) break;
        sessionsRemainingForDuration = uniqueHistory.durations[currentDurationIndex].count;
        currentDurationIndex++;
      }

      const timestamp = uniqueHistory.completion_timestamps[i];
      const shouldContinue = updatePeriodCounters(timestamp, periodBoundaries, stats, uniqueHistory);
      if (!shouldContinue) break;

      sessionsRemainingForDuration--;
    }

    calculateAverages(now, periodBoundaries, stats, uniqueHistory);
    return stats;
  });
}

export async function addCompletedSession(duration: number): Promise<void> {
  await withMutex(historyMutex, async () => {
    const history = await historyStorage.loadHistory();
    const now = new Date();
    const newTimestamp = HistoryUtils.dateToTimestamp(now);
    
    // Prevent duplicate sessions within the same minute
    const lastTimestamp = history.completion_timestamps[history.completion_timestamps.length - 1];
    if (lastTimestamp === newTimestamp) {
      console.warn('[addCompletedSession] Duplicate timestamp detected, skipping:', {
        timestamp: newTimestamp,
        lastTimestamp,
        duration
      });
      return;
    }
    
    history.completion_timestamps.push(newTimestamp);
    HistoryUtils.updateCountedValues(history.durations, duration);
    HistoryUtils.updateCountedValues(history.timezones, now.getTimezoneOffset());
    
    console.log('[addCompletedSession] Session added:', {
      timestamp: newTimestamp,
      duration,
      totalSessions: history.completion_timestamps.length
    });
    
    await historyStorage.saveHistory(history);
  });
}

export async function getSessionHistory(): Promise<PomodoroHistory> {
  return await historyStorage.loadHistory();
}

export async function clearSessionHistory(): Promise<void> {
  await historyStorage.clearHistory();
}

/**
 * Remove duplicate timestamps from history and adjust duration counts accordingly
 */
export async function deduplicateHistory(): Promise<{ removed: number }> {
  return await withMutex(historyMutex, async () => {
    const history = await historyStorage.loadHistory();
    const originalCount = history.completion_timestamps.length;
    
    if (originalCount === 0) {
      return { removed: 0 };
    }
    
    // Remove duplicates while preserving order
    const uniqueTimestamps = [...new Set(history.completion_timestamps)];
    const duplicatesCount = originalCount - uniqueTimestamps.length;
    
    if (duplicatesCount > 0) {
      console.log(`[deduplicateHistory] Removing ${duplicatesCount} duplicate timestamps`);
      
      // Update the history with deduplicated timestamps
      const cleanedHistory: PomodoroHistory = {
        ...history,
        completion_timestamps: uniqueTimestamps
      };
      
      await historyStorage.saveHistory(cleanedHistory);
    }
    
    return { removed: duplicatesCount };
  });
}

/**
 * Merges imported history data with existing history
 */
export async function mergeHistory(importedData: ImportData): Promise<void> {
  await withMutex(historyMutex, async () => {
    const currentHistory = await historyStorage.loadHistory();

    // Convert imported pairs to CountedValue arrays
    const importedDurations: CountedValue<number>[] = [];
    const importedTimezones: CountedValue<number>[] = [];
    
    for (let i = 0; i < importedData.durations.length; i += 2) {
      importedDurations.push({
        count: importedData.durations[i],
        value: importedData.durations[i + 1]
      });
    }
    
    for (let i = 0; i < importedData.timezones.length; i += 2) {
      importedTimezones.push({
        count: importedData.timezones[i],
        value: importedData.timezones[i + 1]
      });
    }

    const mergedTimestamps = [...currentHistory.completion_timestamps];
    const mergedDurations = [...currentHistory.durations];
    const mergedTimezones = [...currentHistory.timezones];
    let addedCount = 0;

    const durationAdjustments = new Map<number, number>();
    const timezoneAdjustments = new Map<number, number>();

    for (let i = 0; i < importedData.pomodoros.length; i++) {
      const timestamp = importedData.pomodoros[i];
      const insertIndex = HistoryUtils.binarySearch(mergedTimestamps, timestamp);
      
      if (mergedTimestamps[insertIndex] === timestamp) {
        continue;
      }

      mergedTimestamps.splice(insertIndex, 0, timestamp);
      addedCount++;

      let durationSum = 0;
      let durationValue = 0;
      for (let j = 0; j < importedDurations.length; j++) {
        durationSum += importedDurations[j].count;
        if (i < durationSum) {
          durationValue = importedDurations[j].value;
          durationAdjustments.set(
            durationValue, 
            (durationAdjustments.get(durationValue) || 0) + 1
          );
          break;
        }
      }

      let timezoneSum = 0;
      let timezoneValue = 0;
      for (let j = 0; j < importedTimezones.length; j++) {
        timezoneSum += importedTimezones[j].count;
        if (i < timezoneSum) {
          timezoneValue = importedTimezones[j].value;
          timezoneAdjustments.set(
            timezoneValue, 
            (timezoneAdjustments.get(timezoneValue) || 0) + 1
          );
          break;
        }
      }
    }

    if (addedCount > 0) {
      // Adjust duration counts
      for (const [value, countToAdd] of durationAdjustments) {
        let found = false;
        for (let i = 0; i < mergedDurations.length; i++) {
          if (mergedDurations[i].value === value) {
            mergedDurations[i].count += countToAdd;
            found = true;
            break;
          }
        }
        if (!found) {
          mergedDurations.push({ value, count: countToAdd });
        }
      }

      // Adjust timezone counts
      for (const [value, countToAdd] of timezoneAdjustments) {
        let found = false;
        for (let i = 0; i < mergedTimezones.length; i++) {
          if (mergedTimezones[i].value === value) {
            mergedTimezones[i].count += countToAdd;
            found = true;
            break;
          }
        }
        if (!found) {
          mergedTimezones.push({ value, count: countToAdd });
        }
      }

      const mergedHistory: PomodoroHistory = {
        completion_timestamps: mergedTimestamps,
        durations: mergedDurations,
        timezones: mergedTimezones,
        version: Math.max(currentHistory.version, importedData.version)
      };

      await historyStorage.saveHistory(mergedHistory);
    }
  });
}

/**
 * Creates export data from history in the format needed for JSON export
 */
export function createExportData(history: PomodoroHistory): ImportData {
  const durations: number[] = [];
  history.durations.forEach(d => {
    durations.push(d.count, d.value);
  });

  const timezones: number[] = [];
  history.timezones.forEach(t => {
    timezones.push(t.count, t.value);
  });

  return {
    durations,
    pomodoros: history.completion_timestamps,
    timezones,
    version: history.version
  };
}

/**
 * Creates CSV data from history
 */
export function createCsvData(history: PomodoroHistory): CsvRow[] {
  const rows: CsvRow[] = [];
  let durationIndex = 0;
  let sessionsRemainingForDuration = 0;
  let currentDuration = 0;

  history.completion_timestamps.forEach(timestamp => {
    if (sessionsRemainingForDuration === 0) {
      if (durationIndex < history.durations.length) {
        currentDuration = history.durations[durationIndex].value;
        sessionsRemainingForDuration = history.durations[durationIndex].count;
        durationIndex++;
      }
    }

    const timezoneOffset = HistoryUtils.findTimezoneOffsetForTimestamp(history, timestamp);

    const date = new Date(timestamp * 60000);
    const isoDate = date.toISOString().replace('Z', HistoryUtils.formatTimezoneOffset(timezoneOffset));
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0];
    
    rows.push({
      isoDate,
      dateStr,
      timeStr,
      timestamp: timestamp * 60,
      timezoneOffset,
      duration: currentDuration * 60
    });

    sessionsRemainingForDuration--;
  });

  return rows;
}

/**
 * Groups timestamps by day, accounting for timezones
 */
export function getDailyGroups(history: PomodoroHistory, since: Date): Record<number, number> {
  const daily: Record<number, number> = {};
  if (history.completion_timestamps.length === 0) return daily;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const timestampToOffset = HistoryUtils.createTimestampOffsetMap(history);
  const defaultOffset = new Date().getTimezoneOffset();

  const sortedTimestamps = [...history.completion_timestamps].sort((a, b) => b - a);
  let currentDate = new Date(today);

  while (currentDate >= since) {
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const nextDay = new Date(startOfDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const startTimestamp = Math.floor(startOfDay.getTime() / 60000);
    const endTimestamp = Math.floor(nextDay.getTime() / 60000);

    let dayCount = 0;
    for (const timestamp of sortedTimestamps) {
      // Don't adjust timestamps - they're already in UTC
      // Instead, compare directly against UTC day boundaries
      if (timestamp >= startTimestamp && timestamp < endTimestamp) {
        dayCount++;
      }
    }

    if (dayCount > 0) {
      daily[+startOfDay] = dayCount;
    }

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return daily;
} 