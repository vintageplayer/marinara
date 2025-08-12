import pomodoroTimer from './core/pomodoro-timer';
import { initializeContextMenu, handleContextMenuClick } from './ui/context-menu';
import { initializeMessageHandlers } from './messaging/messages';
import { deduplicateHistory } from './core/pomodoro-history';

// Initialize context menu and clean up any duplicate history entries
chrome.runtime.onInstalled.addListener(async () => {
  initializeContextMenu();
  
  // Clean up any existing duplicate timestamps
  try {
    const result = await deduplicateHistory();
    if (result.removed > 0) {
      console.log(`[Background] Cleaned up ${result.removed} duplicate history entries`);
    }
  } catch (error) {
    console.error('[Background] Error deduplicating history:', error);
  }
});

// Initialize message handlers
initializeMessageHandlers();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Handle extension icon clicks
chrome.action.onClicked.addListener(() => {
  pomodoroTimer.toggleTimerState();
});

// Handle notification clicks - start next timer
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'pomodoro-complete') {
    chrome.notifications.clear(notificationId);
    // Start the next timer (completion handler will close pages)
    pomodoroTimer.toggleTimerState();
  }
});