import { TimerState } from '../core/pomodoro-settings';
import { notifyTimerComplete } from '../notifications/completion-notifications';
import { addCompletedSession } from '../core/pomodoro-history';
import { settingsManager } from './settings-manager';
import { debugLogger } from '../services/debug-logger';

export class CompletionHandler {
  private lastState: TimerState | null = null;

  public handleStateChange(newState: TimerState): void {
    debugLogger.log('CompletionHandler', 'handleStateChange', 'called', {
      lastState: this.lastState ? {
        timerStatus: this.lastState.timerStatus,
        timerType: this.lastState.timerType,
        initialDurationMinutes: this.lastState.initialDurationMinutes,
        sessionsSinceLastLongBreak: this.lastState.sessionsSinceLastLongBreak
      } : null,
      newState: {
        timerStatus: newState.timerStatus,
        timerType: newState.timerType,
        initialDurationMinutes: newState.initialDurationMinutes,
        sessionsSinceLastLongBreak: newState.sessionsSinceLastLongBreak
      }
    });
    
    // Close completion pages and clear notifications when starting any timer
    if (this.isTimerStartEvent(this.lastState, newState)) {
      debugLogger.log('CompletionHandler', 'handleStateChange', 'timer start detected - closing pages and clearing notifications');
      this.closeCompletionPages();
      this.clearNotifications();
    }

    // Handle completion events
    const isCompletion = this.isCompletionEvent(this.lastState, newState);
    debugLogger.log('CompletionHandler', 'handleStateChange', 'checking completion event', {
      isCompletion,
      oldStatus: this.lastState?.timerStatus,
      newStatus: newState.timerStatus
    });
    
    if (isCompletion) {
      // Store the last state before it gets updated
      const completedState = { ...this.lastState! };
      debugLogger.log('CompletionHandler', 'handleStateChange', 'COMPLETION EVENT DETECTED', {
        completedState: {
          type: completedState.timerType,
          initialDurationMinutes: completedState.initialDurationMinutes,
          status: completedState.timerStatus,
          sessionsSinceLastLongBreak: completedState.sessionsSinceLastLongBreak
        },
        newState: {
          type: newState.timerType,
          status: newState.timerStatus,
          sessionsSinceLastLongBreak: newState.sessionsSinceLastLongBreak
        }
      });
      
      this.lastState = { ...newState };
      this.handleCompletion(completedState);
    } else {
      // For non-completion events, just update the last state
      debugLogger.log('CompletionHandler', 'handleStateChange', 'no completion event - just updating state', {
        lastState: this.lastState?.timerStatus,
        newState: newState.timerStatus
      });
      this.lastState = { ...newState };
    }
  }

  private isCompletionEvent(oldState: TimerState | null, newState: TimerState): boolean {
    return oldState?.timerStatus === 'running' && newState.timerStatus === 'stopped';
  }

  private isTimerStartEvent(oldState: TimerState | null, newState: TimerState): boolean {
    // Close completion pages whenever a timer starts running
    return newState.timerStatus === 'running' && (
      oldState?.timerStatus === 'stopped' || 
      oldState?.timerStatus === 'paused' ||
      !oldState
    );
  }

  private async handleCompletion(completedState: TimerState): Promise<void> {
    if (!completedState.timerType) {
      await debugLogger.log('CompletionHandler', 'handleCompletion', 'no timer type - returning');
      return;
    }

    await debugLogger.log('CompletionHandler', 'handleCompletion', 'started', {
      type: completedState.timerType,
      initialDurationMinutes: completedState.initialDurationMinutes,
      sessionsSinceLastLongBreak: completedState.sessionsSinceLastLongBreak
    });

    // Wait for settings to be loaded and get the current settings for this timer type
    await settingsManager.waitForInitialization();
    const settings = settingsManager.getSettings();
    const timerSettings = settings[completedState.timerType];

    // Show desktop notification and play sound if enabled
    await debugLogger.log('CompletionHandler', 'handleCompletion', 'showing notification', { type: completedState.timerType });
    await notifyTimerComplete(completedState.timerType, timerSettings);
    
    // Store history for focus sessions
    if (completedState.timerType === 'focus' && completedState.initialDurationMinutes) {
      await debugLogger.log('CompletionHandler', 'handleCompletion', 'ABOUT TO STORE FOCUS SESSION', {
        durationMinutes: completedState.initialDurationMinutes
      });
      await addCompletedSession(completedState.initialDurationMinutes);
      await debugLogger.log('CompletionHandler', 'handleCompletion', 'focus session stored successfully');
    }
    
    await debugLogger.log('CompletionHandler', 'handleCompletion', 'closing completion pages');
    await this.closeCompletionPages();
    
    // Only open completion tab if enabled in settings
    if (timerSettings.notifications.tab) {
      await debugLogger.log('CompletionHandler', 'handleCompletion', 'opening completion page');
      await this.openCompletionPage();
    }
    
    await debugLogger.log('CompletionHandler', 'handleCompletion', 'completed');
  }

  private async closeCompletionPages(): Promise<void> {
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('phaseComplete.html') });
    console.log('[DEBUG][CompletionHandler] closeCompletionPages:', {
      timestamp: new Date().toISOString(),
      tabsFound: tabs.length,
      tabIds: tabs.map(t => t.id)
    });
    
    for (const tab of tabs) {
      console.log('[DEBUG][CompletionHandler] Closing completion tab:', { tabId: tab.id });
      await chrome.tabs.remove(tab.id!);
    }
  }

  private async openCompletionPage(): Promise<void> {
    console.log('[DEBUG][CompletionHandler] openCompletionPage called:', {
      timestamp: new Date().toISOString()
    });
    
    try {
      // Get the currently active tab to position the new tab next to it
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      console.log('[DEBUG][CompletionHandler] Creating new completion tab:', {
        activeTabId: activeTab?.id,
        activeTabIndex: activeTab?.index
      });
      
      const newTab = await chrome.tabs.create({
        url: chrome.runtime.getURL('phaseComplete.html'),
        active: true,
        // Open next to the current active tab (or at the end if no active tab found)
        index: activeTab ? activeTab.index + 1 : undefined
      });
      
      console.log('[DEBUG][CompletionHandler] Completion tab created successfully:', {
        newTabId: newTab.id,
        newTabIndex: newTab.index
      });
    } catch (error) {
      console.error('[DEBUG][CompletionHandler] Error opening completion page:', error);
      // Fallback to opening without positioning
      const fallbackTab = await chrome.tabs.create({
        url: chrome.runtime.getURL('phaseComplete.html'),
        active: true
      });
      console.log('[DEBUG][CompletionHandler] Fallback completion tab created:', {
        tabId: fallbackTab.id
      });
    }
  }

  private clearNotifications(): void {
    // Clear any existing pomodoro completion notifications
    chrome.notifications.clear('pomodoro-complete');
  }

} 