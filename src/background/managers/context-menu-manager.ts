import { TimerState } from '../core/pomodoro-settings';
import { initializeContextMenu } from '../ui/context-menu';

export class ContextMenuManager {
  public async handleStateChange(_newState: TimerState): Promise<void> {
    try {
      await initializeContextMenu();
    } catch (error) {
      console.error('Error updating context menu:', error);
    }
  }
} 