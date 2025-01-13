import { Mutex, withMutex } from '../ui/mutex';

export interface PomodoroHistory {
  pomodoros: number[];  // Unix timestamps in minutes
  durations: number[];  // Durations in minutes
  timezones: number[];  // Timezone offset in minutes from UTC
  version: number;
}

const STORAGE_KEY = 'pomodoroHistory';
const CURRENT_VERSION = 1;

// Create a singleton mutex instance for history operations
const historyMutex = new Mutex();

const createEmptyHistory = (): PomodoroHistory => ({
  pomodoros: [],
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

export async function addCompletedSession(duration: number): Promise<void> {
  await withMutex(historyMutex, async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const history = result[STORAGE_KEY] ? result[STORAGE_KEY] : createEmptyHistory();
    
    const now = new Date();
    history.pomodoros.push(dateToTimestamp(now));
    history.durations.push(duration);
    history.timezones.push(now.getTimezoneOffset());
    
    await chrome.storage.local.set({ [STORAGE_KEY]: history });
  });
}

export async function getSessionHistory(): Promise<PomodoroHistory> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const history = result[STORAGE_KEY];
  
  if (!history) {
    return createEmptyHistory();
  }
  
  // Ensure all required arrays exist
  return {
    pomodoros: Array.isArray(history.pomodoros) ? history.pomodoros : [],
    durations: Array.isArray(history.durations) ? history.durations : [],
    timezones: Array.isArray(history.timezones) ? history.timezones : [],
    version: history.version || CURRENT_VERSION
  };
}

export async function clearSessionHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
} 