import { TimerType } from './pomodoro-settings';

export class TimerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimerError';
  }
}

export function calculateRemainingTime(endTime: number | null): number | null {
  if (!endTime) return null;
  
  if (typeof endTime !== 'number' || isNaN(endTime)) {
    throw new TimerError('Invalid end time provided');
  }

  const now = Date.now();
  const remainingMs = endTime - now;
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  
  // Log suspicious instant completions
  if (remainingSeconds === 0 && remainingMs < -1000) {
    console.log('[DEBUG][TimerUtils] calculateRemainingTime - INSTANT COMPLETION DETECTED:', {
      endTime: new Date(endTime).toISOString(),
      now: new Date(now).toISOString(),
      remainingMs,
      remainingSeconds,
      timeDiff: endTime - now
    });
  }
  
  return remainingSeconds;
}

// Validation functions
export function validateTimerState(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  
  const requiredFields = [
    'version',
    'timerStatus',
    'timerType',
    'lastCompletedPhaseType',
    'endTime',
    'remainingTime',
    'lastSessionDate'
  ];
  
  return requiredFields.every(field => field in (state as object));
} 