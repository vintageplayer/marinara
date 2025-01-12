import { initializeTimer, handleClick } from './pomodoro-timer';
import { initializeContextMenu, handleContextMenuClick } from './context-menu';
import { initializeMessageHandlers } from './messages';

// Initialize timer state
initializeTimer();

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
  handleClick();
});