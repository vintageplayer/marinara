import { TimerState, TimerType, TIMER_DURATIONS } from '../core/pomodoro-settings';
import { notifyTimerComplete } from '../notifications/completion-notifications';
import { addCompletedSession } from '../core/pomodoro-history';

export class CompletionHandler {
  private lastState: TimerState | null = null;

  public handleStateChange(newState: TimerState): void {
    // Check if this is a completion event
    if (this.isCompletionEvent(this.lastState, newState)) {
      this.handleCompletion(this.lastState!.timerType!);
    }
    
    // Check if timer is being started
    if (this.isTimerStartEvent(this.lastState, newState)) {
      this.closeCompletionPages();
    }
    
    this.lastState = { ...newState };
  }

  private isCompletionEvent(lastState: TimerState | null, newState: TimerState): boolean {
    return lastState !== null && 
           lastState.timerStatus === 'running' && 
           newState.timerStatus === 'stopped' &&
           lastState.timerType !== null;
  }

  private isTimerStartEvent(lastState: TimerState | null, newState: TimerState): boolean {
    return newState.timerStatus === 'running' && 
           newState.timerType !== null &&
           (lastState === null || lastState.timerStatus !== 'running');
  }

  private async handleCompletion(completedPhaseType: TimerType): Promise<void> {
    notifyTimerComplete(completedPhaseType);
    
    // Store history for focus sessions
    if (completedPhaseType === 'focus') {
      await addCompletedSession(TIMER_DURATIONS.focus / 60); // Convert seconds to minutes
    }
    
    await this.closeCompletionPages();
    await this.openCompletionPage();
  }

  private async closeCompletionPages(): Promise<void> {
    try {
      const phaseCompletionUrl = chrome.runtime.getURL('phaseComplete.html');
      const tabs = await chrome.tabs.query({ url: phaseCompletionUrl });
      await Promise.all(tabs.map(tab => tab.id && chrome.tabs.remove(tab.id)));
    } catch (error) {
      console.error('Error closing phase completion tabs:', error);
    }
  }

  private async openCompletionPage(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      await chrome.tabs.create({
        url: chrome.runtime.getURL('phaseComplete.html'),
        index: tab ? tab.index + 1 : undefined,
        active: true
      });
    } catch (error) {
      console.error('Error opening timer complete page:', error);
    }
  }
} 