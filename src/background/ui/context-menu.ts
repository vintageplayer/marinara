import pomodoroTimer from '../core/pomodoro-timer';
import { MenuIds } from './context-menu-ids';
import { menuStructure, MenuItem } from './context-menu-items';
import { withMutex, Mutex } from './mutex';

// Create a mutex for context menu initialization
const initMutex = new Mutex();

export async function initializeContextMenu() {
  await withMutex(initMutex, async () => {
    try {
      await new Promise<void>((resolve) => chrome.contextMenus.removeAll(resolve));
      await createMenuStructure();
      await updateMenuState();
    } catch (error) {
      console.error('Error initializing context menu:', error);
    }
  });
}

async function createMenuItem(item: MenuItem) {
  await chrome.contextMenus.create({
    id: item.id,
    title: item.title,
    type: item.type || 'normal',
    contexts: ['action'],
    parentId: item.parentId,
    visible: item.parentId ? true : false
  });
}

async function createMenuStructure() {
  // Flatten menu structure and create all items
  for (const group of menuStructure) {
    for (const item of group.items) {
      await createMenuItem(item);
    }
  }
}

async function updateMenuState() {
  // Update visibility based on menu structure
  for (const group of menuStructure) {
    const groupVisible = group.isVisible?.() ?? true;
    
    for (const item of group.items) {
      const isVisible = groupVisible && (item.isVisible?.() ?? true);
      await chrome.contextMenus.update(item.id, { visible: isVisible });
    }
  }
}

export function handleContextMenuClick(info: chrome.contextMenus.OnClickData) {
  switch (info.menuItemId) {
    case MenuIds.PAUSE:
      pomodoroTimer.pause();
      break;
    case MenuIds.RESUME:
      pomodoroTimer.resume();
      break;
    case MenuIds.STOP:
      pomodoroTimer.stop();
      break;
    case MenuIds.START_CYCLE:
      pomodoroTimer.resetCycle();
      break;
    case MenuIds.START.FOCUS:
    case MenuIds.RESTART.FOCUS:
      pomodoroTimer.start('focus');
      break;
    case MenuIds.START.SHORT_BREAK:
    case MenuIds.RESTART.SHORT_BREAK:
      pomodoroTimer.start('short-break');
      break;
    case MenuIds.START.LONG_BREAK:
    case MenuIds.RESTART.LONG_BREAK:
      pomodoroTimer.start('long-break');
      break;
    case MenuIds.RESTART_CYCLE:
      pomodoroTimer.resetCycle();
      break;
    case MenuIds.VIEW_HISTORY:
      // Open options page to the history route
      const historyUrl = chrome.runtime.getURL('options.html#/history');
      chrome.tabs.create({ url: historyUrl });
      break;
    case MenuIds.OPTIONS:
      // Open options page to the settings route
      const optionsUrl = chrome.runtime.getURL('options.html#/settings');
      chrome.tabs.create({ url: optionsUrl });
      break;
  }
} 