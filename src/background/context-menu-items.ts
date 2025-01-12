import { MenuIds, MenuItem } from './context-menu-ids';

export const timerControls: MenuItem[] = [
  { id: MenuIds.PAUSE, title: 'Pause Timer' },
  { id: MenuIds.RESUME, title: 'Resume Timer' },
  { id: MenuIds.STOP, title: 'Stop Timer' }
];

export const startOptions: MenuItem[] = [
  { id: MenuIds.START.FOCUS, title: 'Start Focusing' },
  { id: MenuIds.START.SHORT_BREAK, title: 'Start Short Break' },
  { id: MenuIds.START.LONG_BREAK, title: 'Start Long Break' }
];

export const restartMenu: MenuItem = {
  id: MenuIds.RESTART.MENU,
  title: 'Restart Timer'
};

export const restartSubmenu: MenuItem[] = [
  { id: MenuIds.RESTART.FOCUS, title: 'Start Focusing', parentId: MenuIds.RESTART.MENU },
  { id: MenuIds.RESTART.SHORT_BREAK, title: 'Start Short Break', parentId: MenuIds.RESTART.MENU },
  { id: MenuIds.RESTART.LONG_BREAK, title: 'Start Long Break', parentId: MenuIds.RESTART.MENU }
];

export const additionalItems: MenuItem[] = [
  { id: MenuIds.RESTART_CYCLE, title: 'Restart Pomodoro Cycle' },
  { id: MenuIds.VIEW_HISTORY, title: 'View History' }
]; 