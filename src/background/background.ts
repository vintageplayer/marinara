import { initializeTimer } from './timer';
import { initializeContextMenu, handleContextMenuClick } from './context-menu';

// Initialize timer state
initializeTimer();

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  initializeContextMenu();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Keep service worker alive
function polling() {
  setTimeout(polling, 1000 * 30);
}

polling();
