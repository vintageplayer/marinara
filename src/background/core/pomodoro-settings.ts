export type TimerType = 'focus' | 'short-break' | 'long-break';
export type TimerStatus = 'running' | 'paused' | 'stopped';

export interface TimerSettings {
  duration: number; // Duration in minutes
  timerSound: string | null;
  notifications: {
    desktop: boolean;
    tab: boolean;
    sound: string | null;
  };
}

export interface LongBreakSettings extends TimerSettings {
  interval: number;
}

export interface PomodoroSettings {
  focus: TimerSettings;
  'short-break': TimerSettings;
  'long-break': LongBreakSettings;
}

export interface TimerState {
  version: number;      // Version of the timer state format
  timerStatus: TimerStatus;
  timerType: TimerType | null;
  lastCompletedPhaseType: TimerType | null;
  endTime: number | null;
  remainingTime: number | null;  // Remaining time in seconds
  initialDurationMinutes: number | null;  // Duration in minutes that was set when timer started
  sessionsToday: number;      // Number of focus sessions completed today
  sessionsSinceLastLongBreak: number;  // Add this field
  lastSessionDate: string;    // ISO date string of the last completed session
}

// Default settings
export const DEFAULT_SETTINGS: PomodoroSettings = {
  focus: {
    duration: 25, // 25 minutes
    timerSound: null,
    notifications: {
      desktop: true,
      tab: true,
      sound: null
    }
  },
  'short-break': {
    duration: 5, // 5 minutes
    timerSound: null,
    notifications: {
      desktop: true,
      tab: true,
      sound: null
    }
  },
  'long-break': {
    duration: 15, // 15 minutes
    interval: 4,
    timerSound: null,
    notifications: {
      desktop: true,
      tab: true,
      sound: null
    }
  }
};

// Constants for timer-related values
export const TIMER_UPDATE_INTERVAL = 1000; // 1 second in milliseconds 