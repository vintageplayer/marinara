import pomodoroTimer from './core/pomodoro-timer';
import { initializeContextMenu, handleContextMenuClick } from './ui/context-menu';
import { initializeMessageHandlers } from './messaging/messages';

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  initializeContextMenu();
});

// Initialize message handlers
initializeMessageHandlers();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Handle extension icon clicks
chrome.action.onClicked.addListener(() => {
  pomodoroTimer.toggleTimerState();
});

// Handle notification clicks - start next timer cycle
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'pomodoro-complete') {
    chrome.notifications.clear(notificationId);
    pomodoroTimer.toggleTimerState();
  }
});