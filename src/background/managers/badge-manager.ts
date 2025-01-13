import { TimerState } from '../core/pomodoro-settings';
import { updateBadge, clearBadge } from '../ui/extension-badge';

export class BadgeManager {
  public handleStateChange(newState: TimerState): void {
    if (newState.timerStatus === 'stopped') {
      clearBadge();
    } else {
      updateBadge(newState);
    }
  }
} 