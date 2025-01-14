import { Mutex, withMutex } from '../ui/mutex';

interface CountedValue<T> {
  value: T;
  count: number;
}

export interface PomodoroStats {
  daily: number;    // Sessions completed today
  weekly: number;   // Sessions completed this week
  monthly: number;  // Sessions completed this month
}

export interface PomodoroHistory {
  completion_timestamps: number[];  // Unix timestamps in minutes
  durations: CountedValue<number>[];  // Durations in minutes with count
  timezones: CountedValue<number>[];  // Timezone offset in minutes from UTC with count
  version: number;
}

const STORAGE_KEY = 'pomodoroHistory';
const CURRENT_VERSION = 1;

// Create a singleton mutex instance for history operations
const historyMutex = new Mutex();

/**
 * Creates empty stats object with all counters initialized to zero
 */
const createEmptyStats = (): PomodoroStats => ({
  daily: 0,
  weekly: 0,
  monthly: 0
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
  // Start of current day (midnight)
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Start of current week (Sunday)
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  
  // Start of current month
  const startOfMonth = new Date(startOfDay);
  startOfMonth.setDate(1);
  
  return {
    dayStart: dateToTimestamp(startOfDay),
    weekStart: dateToTimestamp(startOfWeek),
    monthStart: dateToTimestamp(startOfMonth)
  };
};

/**
 * Processes a timestamp and updates period counters based on when it occurred
 */
const updatePeriodCounters = (
  timestamp: number,
  boundaries: { dayStart: number; weekStart: number; monthStart: number },
  counters: { daily: number; weekly: number; monthly: number }
) => {
  if (timestamp >= boundaries.dayStart) {
    counters.daily++;
    counters.weekly++;
    counters.monthly++;
  } else if (timestamp >= boundaries.weekStart) {
    counters.weekly++;
    counters.monthly++;
  } else if (timestamp >= boundaries.monthStart) {
    counters.monthly++;
    return false; // Signal to stop processing if we're past all relevant periods
  }
  return true; // Continue processing
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

    const periodBoundaries = getTimePeriodBoundaries(new Date());
    const stats = createEmptyStats();
    
    let currentDurationIndex = 0;
    let sessionsRemainingForDuration = 0;

    // Process timestamps from newest to oldest
    for (let i = history.completion_timestamps.length - 1; i >= 0; i--) {
      // Get the count for current duration if we've used up previous count
      if (sessionsRemainingForDuration === 0) {
        if (currentDurationIndex >= history.durations.length) break;
        sessionsRemainingForDuration = history.durations[currentDurationIndex].count;
        currentDurationIndex++;
      }

      const timestamp = history.completion_timestamps[i];
      const shouldContinue = updatePeriodCounters(timestamp, periodBoundaries, stats);
      if (!shouldContinue) break;

      sessionsRemainingForDuration--;
    }

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