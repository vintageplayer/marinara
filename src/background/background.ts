import { initializeTimer, getCurrentTimer, startTimer, pauseTimer, resumeTimer, isTimerRunning, isTimerPaused } from './pomodoro-timer';
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
  if (isTimerRunning()) {
    pauseTimer();
  } else if (isTimerPaused()) {
    resumeTimer();
  } else {
    startTimer('focus');
  }
});

// Keep service worker alive
function polling() {
  setTimeout(polling, 1000 * 30);
}

polling();
