import { Mutex, withMutex } from '../ui/mutex';

interface CountedValue<T> {
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

const STORAGE_KEY = 'pomodoroHistory';
const CURRENT_VERSION = 1;
const MINUTES_IN_DAY = 24 * 60;
const MINUTES_IN_WEEK = MINUTES_IN_DAY * 7;
const MINUTES_IN_MONTH = MINUTES_IN_DAY * 30; // Approximation

// Create a singleton mutex instance for history operations
const historyMutex = new Mutex();

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
 * Creates an empty history object with initialized arrays
 */
const createEmptyHistory = (): PomodoroHistory => ({
  completion_timestamps: [],
  durations: [],
  timezones: [],
  version: CURRENT_VERSION
});

/**
 * Converts a Date object to a Unix timestamp in minutes
 */
const dateToTimestamp = (date: Date): number => {
  return Math.floor(date.getTime() / (1000 * 60));
};

/**
 * Updates an array of counted values, either incrementing the last count or adding a new entry
 */
const updateCountedValues = <T>(array: CountedValue<T>[], newValue: T): CountedValue<T>[] => {
  if (array.length === 0 || array[array.length - 1].value !== newValue) {
    array.push({ value: newValue, count: 1 });
  } else {
    array[array.length - 1].count++;
  }
  return array;
};

/**
 * Gets the start timestamps for today, this week, and this month
 */
const getTimePeriodBoundaries = (now: Date) => {
  // Get the timezone offset in minutes
  const timezoneOffset = now.getTimezoneOffset();
  
  // Start of current day (midnight in local timezone)
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Start of current week (Sunday)
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  
  // Start of current month
  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
  
  // Convert to UTC timestamps in minutes and adjust for timezone
  return {
    dayStart: dateToTimestamp(startOfDay) + timezoneOffset,
    weekStart: dateToTimestamp(startOfWeek) + timezoneOffset,
    monthStart: dateToTimestamp(startOfMonth) + timezoneOffset
  };
};

/**
 * Processes a timestamp and updates period counters based on when it occurred
 */
const updatePeriodCounters = (
  timestamp: number,
  boundaries: { dayStart: number; weekStart: number; monthStart: number },
  counters: { daily: number; weekly: number; monthly: number },
  history: PomodoroHistory
) => {
  // Get the timezone offset for this timestamp
  const timezoneOffset = findTimezoneOffsetForTimestamp(history, timestamp);
  
  // Adjust the timestamp with its timezone offset for comparison
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
    // If the timestamp is from the current month, count it regardless of the monthStart boundary
    counters.monthly++;
  } else if (adjustedTimestamp < boundaries.monthStart) {
    return false; // Signal to stop processing if we're before the current month
  }
  return true; // Continue processing
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

  // Get unique timestamps by removing duplicates
  const uniqueTimestamps = [...new Set(history.completion_timestamps)];
  const totalSessions = uniqueTimestamps.length;
  const oldestTimestamp = uniqueTimestamps[0];
  
  // Calculate time delta from first pomodoro to now (in milliseconds)
  const delta = now.getTime() - (oldestTimestamp * 60000);
  
  // Convert to days, weeks, and months (using same logic as original)
  const dayCount = Math.max(delta / (1000 * 60 * 60 * 24), 1);
  const weekCount = Math.max(dayCount / 7, 1);
  const monthCount = Math.max(dayCount / (365.25 / 12), 1);

  // Calculate averages using unique session count
  stats.dailyAvg = totalSessions / dayCount;
  stats.weeklyAvg = totalSessions / weekCount;
  stats.monthlyAvg = totalSessions / monthCount;
};

/**
 * Find the timezone offset for a given timestamp from history
 */
const findTimezoneOffsetForTimestamp = (history: PomodoroHistory, targetTimestamp: number): number => {
  if (history.timezones.length === 0) {
    return new Date().getTimezoneOffset();
  }

  let totalCount = 0;
  for (let i = 0; i < history.timezones.length; i++) {
    totalCount += history.timezones[i].count;
    if (totalCount >= history.completion_timestamps.findIndex(t => t === targetTimestamp) + 1) {
      return history.timezones[i].value;
    }
  }

  return history.timezones[history.timezones.length - 1].value;
};

/**
 * Get historical stats for completed pomodoros
 */
export async function getHistoricalStats(): Promise<PomodoroStats> {
  return await withMutex(historyMutex, async () => {
    const history = await getSessionHistory();
    if (history.completion_timestamps.length === 0) {
      return createEmptyStats();
    }

    // Get unique timestamps
    const uniqueTimestamps = [...new Set(history.completion_timestamps)].sort((a, b) => a - b);
    
    // Create a new history object with unique timestamps
    const uniqueHistory: PomodoroHistory = {
      ...history,
      completion_timestamps: uniqueTimestamps
    };

    const now = new Date();
    const periodBoundaries = getTimePeriodBoundaries(now);
    const stats = createEmptyStats();
    
    let currentDurationIndex = 0;
    let sessionsRemainingForDuration = 0;

    // Process timestamps from newest to oldest
    for (let i = uniqueHistory.completion_timestamps.length - 1; i >= 0; i--) {
      // Get the count for current duration if we've used up previous count
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

    // Calculate averages
    calculateAverages(now, periodBoundaries, stats, uniqueHistory);

    return stats;
  });
}

export async function addCompletedSession(duration: number): Promise<void> {
  await withMutex(historyMutex, async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const history = result[STORAGE_KEY] ? result[STORAGE_KEY] : createEmptyHistory();
    
    const now = new Date();
    history.completion_timestamps.push(dateToTimestamp(now));
    
    // Update durations and timezones with counting logic
    updateCountedValues(history.durations, duration);
    updateCountedValues(history.timezones, now.getTimezoneOffset());
    
    await chrome.storage.local.set({ [STORAGE_KEY]: history });
  });
}

export async function getSessionHistory(): Promise<PomodoroHistory> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const history = result[STORAGE_KEY];
  
  if (!history) {
    return createEmptyHistory();
  }
  
  // Ensure all required arrays exist and have the correct structure
  return {
    completion_timestamps: Array.isArray(history.completion_timestamps) ? history.completion_timestamps : [],
    durations: Array.isArray(history.durations) ? history.durations : [],
    timezones: Array.isArray(history.timezones) ? history.timezones : [],
    version: history.version || CURRENT_VERSION
  };
}

export async function clearSessionHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

/**
 * Binary search to find insertion point
 * Returns the index where all elements at or after are at least min
 */
const binarySearch = (arr: number[], min: number, lo: number = 0, hi: number = arr.length - 1): number => {
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] >= min) {
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }
  return Math.min(lo, arr.length);
};

/**
 * Merges imported history data with existing history
 */
export async function mergeHistory(importedData: ImportData): Promise<void> {
  await withMutex(historyMutex, async () => {
    const currentHistory = await getSessionHistory();

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

    // Create new arrays for merged data
    const mergedTimestamps = [...currentHistory.completion_timestamps];
    const mergedDurations = [...currentHistory.durations];
    const mergedTimezones = [...currentHistory.timezones];

    // Track how many new sessions were added
    let addedCount = 0;

    // Keep track of duration and timezone counts that need to be adjusted
    let durationAdjustments = new Map<number, number>(); // value -> count to add
    let timezoneAdjustments = new Map<number, number>(); // value -> count to add

    // Process each imported timestamp
    for (let i = 0; i < importedData.pomodoros.length; i++) {
      const timestamp = importedData.pomodoros[i];
      
      // Find where this timestamp should be inserted
      const insertIndex = binarySearch(mergedTimestamps, timestamp);
      
      // Skip if this timestamp already exists
      if (mergedTimestamps[insertIndex] === timestamp) {
        continue;
      }

      // Insert the timestamp at the correct position
      mergedTimestamps.splice(insertIndex, 0, timestamp);
      addedCount++;

      // Find the corresponding duration and timezone for this timestamp
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

    // Only update storage if we actually added new sessions
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

      await chrome.storage.local.set({ [STORAGE_KEY]: mergedHistory });
    }
  });
}

/**
 * Creates export data from history in the format needed for JSON export
 */
export function createExportData(history: PomodoroHistory): ImportData {
  // Convert durations to pairs of values
  const durations: number[] = [];
  history.durations.forEach(d => {
    durations.push(d.count, d.value);
  });

  // Convert timezones to pairs of values
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
 * Helper function to format timezone offset
 */
const formatTimezoneOffset = (offsetInMinutes: number): string => {
  const sign = offsetInMinutes <= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetInMinutes);
  const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
  const minutes = (absOffset % 60).toString().padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
};

/**
 * Creates CSV data from history
 */
export function createCsvData(history: PomodoroHistory): CsvRow[] {
  const rows: CsvRow[] = [];
  let durationIndex = 0;
  let sessionsRemainingForDuration = 0;
  let currentDuration = 0;

  history.completion_timestamps.forEach(timestamp => {
    // Get the duration for this timestamp
    if (sessionsRemainingForDuration === 0) {
      if (durationIndex < history.durations.length) {
        currentDuration = history.durations[durationIndex].value;
        sessionsRemainingForDuration = history.durations[durationIndex].count;
        durationIndex++;
      }
    }

    // Get timezone offset for this timestamp
    const timezoneOffset = history.timezones.length > 0 ? 
      history.timezones[history.timezones.length - 1].value : 
      new Date().getTimezoneOffset();

    // Convert timestamp (in minutes) to Date object
    const date = new Date(timestamp * 60000);
    
    // Format the row data
    const isoDate = date.toISOString().replace('Z', formatTimezoneOffset(timezoneOffset));
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

  // Get today's start in the local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Create a map of timestamps to their timezone offsets for quick lookup
  const timestampToOffset = new Map<number, number>();
  let totalCount = 0;
  for (const tz of history.timezones) {
    for (let i = 0; i < tz.count; i++) {
      if (totalCount < history.completion_timestamps.length) {
        timestampToOffset.set(history.completion_timestamps[totalCount], tz.value);
        totalCount++;
      }
    }
  }

  // Default timezone offset if none found
  const defaultOffset = new Date().getTimezoneOffset();

  // Sort timestamps and process them
  const sortedTimestamps = [...history.completion_timestamps].sort((a, b) => b - a); // Newest first
  let currentDate = new Date(today);
  let currentBase = 0;

  while (currentDate >= since) {
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const nextDay = new Date(startOfDay);
    nextDay.setDate(nextDay.getDate() + 1);

    // Convert boundary dates to timestamps with timezone adjustment
    const startTimestamp = Math.floor(startOfDay.getTime() / 60000);
    const endTimestamp = Math.floor(nextDay.getTime() / 60000);

    // Count sessions in this day
    let dayCount = 0;
    for (const timestamp of sortedTimestamps) {
      // Get the timezone offset for this timestamp
      const tzOffset = timestampToOffset.get(timestamp) ?? defaultOffset;
      const adjustedTimestamp = timestamp + tzOffset;

      if (adjustedTimestamp >= startTimestamp && adjustedTimestamp < endTimestamp) {
        dayCount++;
      }
    }

    if (dayCount > 0) {
      daily[+startOfDay] = dayCount;
    }

    // Move to previous day
    currentDate.setDate(currentDate.getDate() - 1);
  }

  return daily;
} 