import { TimerType, TIMER_DURATIONS } from './pomodoro-settings';

export class TimerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimerError';
  }
}

export function getTimerDuration(phaseType: TimerType): number {
  switch (phaseType) {
    case 'focus':
      return TIMER_DURATIONS.focus;
    case 'short-break':
      return TIMER_DURATIONS.shortBreak;
    case 'long-break':
      return TIMER_DURATIONS.longBreak;
    default:
      throw new TimerError(`Unknown timer type: ${phaseType}`);
  }
}

export function calculateRemainingTime(endTime: number | null): number | null {
  if (!endTime) return null;
  
  if (typeof endTime !== 'number' || isNaN(endTime)) {
    throw new TimerError('Invalid end time provided');
  }

  const now = Date.now();
  return Math.max(0, Math.floor((endTime - now) / 1000));
}

// Validation functions
export function validateTimerState(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  
  const requiredFields = [
    'timerStatus',
    'timerType',
    'lastCompletedPhaseType',
    'endTime',
    'remainingTime',
    'sessionsToday',
    'lastSessionDate'
  ];
  
  return requiredFields.every(field => field in (state as object));
} 