import { initializeTimer, handleClick } from './pomodoro-timer';
import { initializeContextMenu, handleContextMenuClick } from './context-menu';

// Initialize timer state
initializeTimer();

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  initializeContextMenu();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Handle extension icon clicks
chrome.action.onClicked.addListener(() => {
  handleClick();
});