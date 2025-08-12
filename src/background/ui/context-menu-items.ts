import { MenuIds } from './context-menu-ids';
import pomodoroTimer from '../core/pomodoro-timer';

export interface MenuItem {
  id: string;
  title: string;
  parentId?: string;
  type?: 'normal' | 'separator';
  isVisible?: () => boolean;
  action?: () => void;
}

export interface MenuGroup {
  items: MenuItem[];
  isVisible?: () => boolean;
}

// Define menu visibility conditions
const isTimerSet = () => pomodoroTimer.isRunning() || pomodoroTimer.isPaused();
const isTimerNotSet = () => !isTimerSet();

// Define menu structure with visibility rules and actions
export const menuStructure: MenuGroup[] = [
  {
    items: [
      { 
        id: MenuIds.PAUSE, 
        title: 'Pause Timer',
        isVisible: () => pomodoroTimer.isRunning()
      },
      { 
        id: MenuIds.RESUME, 
        title: 'Resume Timer',
        isVisible: () => pomodoroTimer.isPaused()
      },
      { 
        id: MenuIds.STOP, 
        title: 'Stop Timer',
        isVisible: () => isTimerSet()
      }
    ],
    isVisible: () => isTimerSet()
  },
  {
    items: [
      { 
        id: MenuIds.START_CYCLE, 
        title: 'Start Pomodoro Cycle'
      },
      { 
        id: MenuIds.START.FOCUS, 
        title: 'Start Focusing'
      },
      { 
        id: MenuIds.START.SHORT_BREAK, 
        title: 'Start Short Break'
      },
      { 
        id: MenuIds.START.LONG_BREAK, 
        title: 'Start Long Break'
      }
    ],
    isVisible: isTimerNotSet
  },
  {
    items: [
      {
        id: MenuIds.RESTART.MENU,
        title: 'Restart Timer',
        isVisible: () => isTimerSet()
      },
      {
        id: MenuIds.RESTART.FOCUS,
        title: 'Start Focusing',
        parentId: MenuIds.RESTART.MENU
      },
      {
        id: MenuIds.RESTART.SHORT_BREAK,
        title: 'Start Short Break',
        parentId: MenuIds.RESTART.MENU
      },
      {
        id: MenuIds.RESTART.LONG_BREAK,
        title: 'Start Long Break',
        parentId: MenuIds.RESTART.MENU
      }
    ],
    isVisible: () => isTimerSet()
  },
  {
    items: [
      {
        id: MenuIds.RESTART_CYCLE,
        title: 'Restart Pomodoro Cycle',
        isVisible: () => isTimerSet()
      }
    ]
  },
  {
    items: [
      { 
        id: MenuIds.SEPARATOR, 
        title: '', 
        type: 'separator' 
      },
      { 
        id: MenuIds.VIEW_HISTORY, 
        title: 'Pomodoro History'
      },
      { 
        id: MenuIds.OPTIONS, 
        title: 'Options'
      }
    ]
  }
]; 