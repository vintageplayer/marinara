export type TimerType = 'focus' | 'short-break' | 'long-break';

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  type: TimerType | null;
  endTime: number | null;
  remainingTime: number | null;
}

export const TIMER_DURATIONS = {
  focus: 25 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60 // 15 minutes
} as const; 