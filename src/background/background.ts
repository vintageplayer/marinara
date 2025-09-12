import pomodoroTimer from './core/pomodoro-timer';
import { initializeContextMenu, handleContextMenuClick } from './ui/context-menu';
import { initializeMessageHandlers } from './messaging/messages';
import { deduplicateHistory } from './core/pomodoro-history';
import { debugLogger } from './services/debug-logger';

// Initialize context menu and clean up any duplicate history entries
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Extension installed/updated, performing cleanup');
  
  initializeContextMenu();
  
  // Clean up stale notifications from previous extension session
  try {
    chrome.notifications.clear('pomodoro-complete');
    console.log('[Background] Cleared stale notifications');
  } catch (error) {
    console.error('[Background] Error clearing notifications:', error);
  }
  
  // Close any leftover phase completion pages
  try {
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('phaseComplete.html') });
    for (const tab of tabs) {
      await chrome.tabs.remove(tab.id!);
    }
    if (tabs.length > 0) {
      console.log(`[Background] Closed ${tabs.length} leftover completion pages`);
    }
  } catch (error) {
    console.error('[Background] Error closing leftover tabs:', error);
  }
  
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

// Clean up when extension is about to unload (more efficient than startup cleanup)
chrome.runtime.onSuspend.addListener(() => {
  console.log('[Background] Extension unloading, performing cleanup');
  
  // Clear any active notifications
  try {
    chrome.notifications.clear('pomodoro-complete');
    console.log('[Background] Cleared notifications on unload');
  } catch (error) {
    console.error('[Background] Error clearing notifications on unload:', error);
  }
  
  // Close any phase completion pages
  // Note: This is synchronous since onSuspend has limited time
  chrome.tabs.query({ url: chrome.runtime.getURL('phaseComplete.html') }, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.remove(tab.id);
      }
    });
    if (tabs.length > 0) {
      console.log(`[Background] Closed ${tabs.length} completion pages on unload`);
    }
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Handle extension icon clicks
chrome.action.onClicked.addListener(() => {
  debugLogger.log('Background', 'action.onClicked', 'EXTENSION ICON CLICKED', {
    trigger: 'extension-icon-click'
  });
  pomodoroTimer.toggleTimerState();
});

// Handle notification clicks - start next timer
chrome.notifications.onClicked.addListener((notificationId) => {
  debugLogger.log('Background', 'notifications.onClicked', 'NOTIFICATION CLICKED', {
    notificationId,
    trigger: 'notification-click'
  });
  
  if (notificationId === 'pomodoro-complete') {
    debugLogger.log('Background', 'notifications.onClicked', 'clearing notification and starting next timer');
    chrome.notifications.clear(notificationId);
    // Start the next timer (completion handler will close pages)
    pomodoroTimer.toggleTimerState();
  }
});