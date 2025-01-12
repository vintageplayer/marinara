import { startTimer, stopTimer, pauseTimer, resumeTimer, isTimerRunning, isTimerPaused } from './pomodoro-timer';
import { MenuIds, MenuItem } from './context-menu-ids';
import { timerControls, startOptions, restartMenu, restartSubmenu, additionalItems, historyGroup } from './context-menu-items';

// Track initialization state
let isInitializing = false;
let pendingInitialization = false;

export async function initializeContextMenu() {
  if (isInitializing) {
    pendingInitialization = true;
    return;
  }

  try {
    isInitializing = true;
    await new Promise<void>((resolve) => chrome.contextMenus.removeAll(resolve));
    await createMenuStructure();
    await updateMenuState();

    if (pendingInitialization) {
      pendingInitialization = false;
      isInitializing = false;
      await initializeContextMenu();
    }
  } catch (error) {
    console.error('Error initializing context menu:', error);
  } finally {
    if (!pendingInitialization) {
      isInitializing = false;
    }
  }
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
  // Create all menu items
  for (const item of [...timerControls, ...startOptions]) {
    await createMenuItem(item);
  }

  // Create restart menu and its submenu
  await createMenuItem(restartMenu);
  for (const item of restartSubmenu) {
    await createMenuItem(item);
  }

  // Create additional items
  for (const item of additionalItems) {
    await createMenuItem(item);
  }

  // Create history group
  for (const item of historyGroup) {
    await createMenuItem(item);
  }
}

async function updateMenuState() {
  const isRunning = isTimerRunning();
  const isPaused = isTimerPaused();

  // Update menu visibility based on timer state
  const updates = isRunning || isPaused
    ? {
        [MenuIds.RESTART.MENU]: true,
        [MenuIds.PAUSE]: isRunning,
        [MenuIds.RESUME]: isPaused,
        [MenuIds.STOP]: true,
        [MenuIds.RESTART_CYCLE]: true,
        [MenuIds.START.FOCUS]: false,
        [MenuIds.START.SHORT_BREAK]: false,
        [MenuIds.START.LONG_BREAK]: false,
        [MenuIds.VIEW_HISTORY]: true
      }
    : {
        [MenuIds.RESTART.MENU]: false,
        [MenuIds.PAUSE]: false,
        [MenuIds.RESUME]: false,
        [MenuIds.STOP]: false,
        [MenuIds.RESTART_CYCLE]: false,
        [MenuIds.START.FOCUS]: true,
        [MenuIds.START.SHORT_BREAK]: true,
        [MenuIds.START.LONG_BREAK]: true,
        [MenuIds.VIEW_HISTORY]: true
      };

  // Update each menu item's visibility
  for (const [id, visible] of Object.entries(updates)) {
    await chrome.contextMenus.update(id, { visible });
  }
}

export function handleContextMenuClick(info: chrome.contextMenus.OnClickData) {
  switch (info.menuItemId) {
    case MenuIds.PAUSE:
      pauseTimer();
      break;
    case MenuIds.RESUME:
      resumeTimer();
      break;
    case MenuIds.STOP:
      stopTimer();
      break;
    case MenuIds.START.FOCUS:
    case MenuIds.RESTART.FOCUS:
      startTimer('focus');
      break;
    case MenuIds.START.SHORT_BREAK:
    case MenuIds.RESTART.SHORT_BREAK:
      startTimer('short-break');
      break;
    case MenuIds.START.LONG_BREAK:
    case MenuIds.RESTART.LONG_BREAK:
      startTimer('long-break');
      break;
    case MenuIds.RESTART_CYCLE:
      startTimer('focus');
      break;
    case MenuIds.VIEW_HISTORY:
      chrome.runtime.openOptionsPage();
      break;
  }
} 