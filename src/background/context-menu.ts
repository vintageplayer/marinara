import { startTimer } from './timer';

export function initializeContextMenu() {
  // Remove existing items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'start-focus',
      title: 'Start Focus',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'start-short-break',
      title: 'Start Short Break',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'start-long-break',
      title: 'Start Long Break',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'view-history',
      title: 'View History',
      contexts: ['action']
    });
  });
}

export function handleContextMenuClick(info: chrome.contextMenus.OnClickData) {
  switch (info.menuItemId) {
    case 'start-focus':
      startTimer('focus');
      break;
    case 'start-short-break':
      startTimer('short-break');
      break;
    case 'start-long-break':
      startTimer('long-break');
      break;
    case 'view-history':
      chrome.runtime.openOptionsPage();
      break;
  }
} 