export type TimerType = 'focus' | 'short-break' | 'long-break';
export type TimerStatus = 'running' | 'paused' | 'stopped';

export interface TimerState {
  timerStatus: TimerStatus;
  timerType: TimerType | null;
  lastCompletedPhaseType: TimerType | null;
  endTime: number | null;
  remainingTime: number | null;
  focusSessionsCompleted: number;  // Number of focus sessions completed before long break
  totalCycles: number;             // Total number of completed pomodoro cycles
}

export const TIMER_DURATIONS = {
  focus: 25 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60 // 15 minutes
};

// Constants for timer-related values
export const TIMER_UPDATE_INTERVAL = 1000; // 1 second in milliseconds

// Take a long break after completing 4 focus sessions
export const FOCUS_SESSIONS_BEFORE_LONG_BREAK = 4; 