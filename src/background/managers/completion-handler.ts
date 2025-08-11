import { TimerState } from '../core/pomodoro-settings';
import { notifyTimerComplete } from '../notifications/completion-notifications';
import { addCompletedSession } from '../core/pomodoro-history';
import { settingsManager } from './settings-manager';

export class CompletionHandler {
  private lastState: TimerState | null = null;

  public handleStateChange(newState: TimerState): void {
    // First check if timer is being started
    if (this.isTimerStartEvent(this.lastState, newState)) {
      console.log('[CompletionHandler] Timer start detected, closing completion pages');
      this.closeCompletionPages();
    }

    // Then check if this is a completion event
    if (this.isCompletionEvent(this.lastState, newState)) {
      // Store the last state before it gets updated
      const completedState = { ...this.lastState! };
      console.log('[CompletionHandler] Detected completion event:', {
        completedState: {
          type: completedState.timerType,
          initialDurationMinutes: completedState.initialDurationMinutes,
          status: completedState.timerStatus
        },
        newState: {
          type: newState.timerType,
          status: newState.timerStatus
        }
      });
      
      this.lastState = { ...newState };
      this.handleCompletion(completedState);
    } else {
      // For non-completion events, just update the last state
      this.lastState = { ...newState };
    }
  }

  private isCompletionEvent(oldState: TimerState | null, newState: TimerState): boolean {
    return oldState?.timerStatus === 'running' && newState.timerStatus === 'stopped';
  }

  private isTimerStartEvent(oldState: TimerState | null, newState: TimerState): boolean {
    // Check if the timer is transitioning to running state
    return newState.timerStatus === 'running' && (
      oldState?.timerStatus === 'stopped' || 
      oldState?.timerStatus === 'paused' ||
      !oldState
    );
  }

  private async handleCompletion(completedState: TimerState): Promise<void> {
    if (!completedState.timerType) return;

    console.log('[CompletionHandler] Handling completion:', {
      type: completedState.timerType,
      initialDurationMinutes: completedState.initialDurationMinutes
    });

    // Wait for settings to be loaded and get the current settings for this timer type
    await settingsManager.waitForInitialization();
    const settings = settingsManager.getSettings();
    const timerSettings = settings[completedState.timerType];

    // Show desktop notification if enabled
    notifyTimerComplete(completedState.timerType, timerSettings);
    
    // Store history for focus sessions
    if (completedState.timerType === 'focus' && completedState.initialDurationMinutes) {
      console.log('[CompletionHandler] Storing focus session:', {
        durationMinutes: completedState.initialDurationMinutes
      });
      await addCompletedSession(completedState.initialDurationMinutes);
    }
    
    await this.closeCompletionPages();
    
    // Only open completion tab if enabled in settings
    if (timerSettings.notifications.tab) {
      await this.openCompletionPage();
    }
  }

  private async closeCompletionPages(): Promise<void> {
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('phaseComplete.html') });
    for (const tab of tabs) {
      await chrome.tabs.remove(tab.id!);
    }
  }

  private async openCompletionPage(): Promise<void> {
    await chrome.tabs.create({
      url: chrome.runtime.getURL('phaseComplete.html'),
      active: true
    });
  }
} 