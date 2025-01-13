import { TimerState } from '../core/pomodoro-settings';
import { validateTimerState } from '../core/timer-utils';

export class TimerStateStorage {
  public async saveState(state: TimerState): Promise<void> {
    try {
      await chrome.storage.local.set({ timer: state });
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  }

  public async loadState(): Promise<TimerState | null> {
    try {
      const storedTimerState = await chrome.storage.local.get(['timer']);
      if (storedTimerState.timer && validateTimerState(storedTimerState.timer)) {
        return storedTimerState.timer;
      }
      return null;
    } catch (error) {
      console.error('Error loading timer state:', error);
      return null;
    }
  }
} 