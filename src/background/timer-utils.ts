import { TimerType, TIMER_DURATIONS } from './pomodoro-settings';

export class TimerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimerError';
  }
}

export function formatPhaseText(type: TimerType): string {
  if (!type) {
    throw new TimerError('Cannot format phase text: Timer type is null');
  }
  
  switch (type) {
    case 'focus':
      return 'Focusing';
    case 'short-break':
      return 'Short Break';
    case 'long-break':
      return 'Long Break';
    default:
      throw new TimerError(`Unknown timer type: ${type}`);
  }
}

export function getTimerDuration(type: TimerType): number {
  if (!type) {
    throw new TimerError('Cannot get duration: Timer type is null');
  }

  switch (type) {
    case 'focus':
      return TIMER_DURATIONS.focus;
    case 'short-break':
      return TIMER_DURATIONS.shortBreak;
    case 'long-break':
      return TIMER_DURATIONS.longBreak;
    default:
      throw new TimerError(`Unknown timer type: ${type}`);
  }
}

export function calculateRemainingTime(endTime: number | null): number | null {
  if (!endTime) return null;
  
  if (typeof endTime !== 'number' || isNaN(endTime)) {
    throw new TimerError('Invalid end time provided');
  }

  const now = Date.now();
  if (endTime < now - 24 * 60 * 60 * 1000) { // More than 24 hours in the past
    throw new TimerError('End time is too far in the past');
  }

  return Math.max(0, Math.floor((endTime - now) / 1000));
}

// Constants for timer-related values
export const TIMER_UPDATE_INTERVAL = 1000; // 1 second in milliseconds

// Validation functions
export function validateTimerState(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  
  const requiredFields = [
    'isRunning',
    'isPaused',
    'type',
    'lastCompletedType',
    'endTime',
    'remainingTime',
    'focusSessionsCompleted',
    'totalCycles'
  ];
  
  return requiredFields.every(field => field in (state as object));
} 