import { PomodoroHistory, CountedValue } from '../core/pomodoro-history';

export class HistoryUtils {
  /**
   * Converts a Date object to a Unix timestamp in minutes
   */
  static dateToTimestamp(date: Date): number {
    return Math.floor(date.getTime() / (1000 * 60));
  }

  /**
   * Updates an array of counted values, either incrementing the last count or adding a new entry
   */
  static updateCountedValues<T>(array: CountedValue<T>[], newValue: T): CountedValue<T>[] {
    if (array.length === 0 || array[array.length - 1].value !== newValue) {
      array.push({ value: newValue, count: 1 });
    } else {
      array[array.length - 1].count++;
    }
    return array;
  }

  /**
   * Gets the start timestamps for today, this week, and this month
   */
  static getTimePeriodBoundaries(now: Date) {
    const timezoneOffset = now.getTimezoneOffset();
    
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);
    
    return {
      dayStart: this.dateToTimestamp(startOfDay) + timezoneOffset,
      weekStart: this.dateToTimestamp(startOfWeek) + timezoneOffset,
      monthStart: this.dateToTimestamp(startOfMonth) + timezoneOffset
    };
  }

  /**
   * Find the timezone offset for a given timestamp from history
   */
  static findTimezoneOffsetForTimestamp(history: PomodoroHistory, targetTimestamp: number): number {
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
  }

  /**
   * Binary search to find insertion point
   */
  static binarySearch(arr: number[], min: number, lo: number = 0, hi: number = arr.length - 1): number {
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (arr[mid] >= min) {
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    return Math.min(lo, arr.length);
  }

  /**
   * Helper function to format timezone offset
   */
  static formatTimezoneOffset(offsetInMinutes: number): string {
    const sign = offsetInMinutes <= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetInMinutes);
    const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
    const minutes = (absOffset % 60).toString().padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
  }

  /**
   * Creates a map of timestamps to their timezone offsets
   */
  static createTimestampOffsetMap(history: PomodoroHistory): Map<number, number> {
    const timestampToOffset = new Map<number, number>();
    let totalCount = 0;
    
    for (const tz of history.timezones) {
      for (let i = 0; i < tz.count && totalCount < history.completion_timestamps.length; i++) {
        timestampToOffset.set(history.completion_timestamps[totalCount], tz.value);
        totalCount++;
      }
    }
    
    return timestampToOffset;
  }
} 