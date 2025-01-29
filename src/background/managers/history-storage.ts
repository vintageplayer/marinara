import { PomodoroHistory } from '../core/pomodoro-history';

const STORAGE_KEY = 'pomodoroHistory';
const CURRENT_VERSION = 1;

export class PomodoroHistoryStorage {
  /**
   * Creates empty history object with initialized arrays
   */
  private createEmptyHistory(): PomodoroHistory {
    return {
      completion_timestamps: [],
      durations: [],
      timezones: [],
      version: CURRENT_VERSION
    };
  }

  public async saveHistory(history: PomodoroHistory): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: history });
    } catch (error) {
      console.error('Error saving history:', error);
      throw error;
    }
  }

  public async loadHistory(): Promise<PomodoroHistory> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const history = result[STORAGE_KEY];
      
      if (!history) {
        return this.createEmptyHistory();
      }
      
      // Ensure all required arrays exist and have the correct structure
      return {
        completion_timestamps: Array.isArray(history.completion_timestamps) ? history.completion_timestamps : [],
        durations: Array.isArray(history.durations) ? history.durations : [],
        timezones: Array.isArray(history.timezones) ? history.timezones : [],
        version: history.version || CURRENT_VERSION
      };
    } catch (error) {
      console.error('Error loading history:', error);
      return this.createEmptyHistory();
    }
  }

  public async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.remove(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing history:', error);
      throw error;
    }
  }
} 