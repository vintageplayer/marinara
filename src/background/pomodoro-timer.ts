import { initializeContextMenu } from './context-menu';
import { TimerState, TimerType, FOCUS_SESSIONS_BEFORE_LONG_BREAK } from './pomodoro-settings';
import { updateBadge, clearBadge } from './extension-badge';
import { notifyTimerComplete } from './completion-notifications';
import { 
  getTimerDuration, 
  calculateRemainingTime, 
  TIMER_UPDATE_INTERVAL,
  TimerError,
  validateTimerState 
} from './timer-utils';

// Current timer state
const defaultTimerState: TimerState = {
  isRunning: false,
  isPaused: false,
  type: null,
  lastCompletedType: null,
  endTime: null,
  remainingTime: null,
  focusSessionsCompleted: 0,
  totalCycles: 0
};

let currentTimer: TimerState = { ...defaultTimerState };

function updateTimerState(updates: Partial<TimerState>) {
  try {
    const newState = {
      ...currentTimer,
      ...updates
    };

    // Validate the new state before applying
    if (!validateTimerState(newState)) {
      throw new TimerError('Invalid timer state update');
    }

    currentTimer = newState;
    saveTimerState();
  } catch (error) {
    console.error('Error updating timer state:', error);
    // Reset to default state if update fails
    currentTimer = { ...defaultTimerState };
    saveTimerState();
  }
}

export function isTimerRunning(): boolean {
  return currentTimer.isRunning;
}

export function isTimerPaused(): boolean {
  return currentTimer.isPaused;
}

export function getCurrentTimer(): TimerState {
  return { ...currentTimer };
}

export function getFocusProgress(): { current: number; total: number } {
  return {
    current: currentTimer.focusSessionsCompleted,
    total: FOCUS_SESSIONS_BEFORE_LONG_BREAK
  };
}

export function getNextTimerType(): TimerType {
  const lastCompletedType = currentTimer.lastCompletedType;
  
  // If no timer has run yet or we just finished a long break, start with focus
  if (!lastCompletedType || lastCompletedType === 'long-break') {
    return 'focus';
  }
  
  // After completing a focus session
  if (lastCompletedType === 'focus') {
    return currentTimer.focusSessionsCompleted >= FOCUS_SESSIONS_BEFORE_LONG_BREAK ? 'long-break' : 'short-break';
  }
  
  // After completing any break, return to focus
  return 'focus';
}

export function handleClick() {
  if (isTimerRunning()) {
    pauseTimer();
  } else if (isTimerPaused()) {
    resumeTimer();
  } else {
    startTimer(getNextTimerType());
  }
}

async function openTimerCompletePage() {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  
  // Open new tab next to current one
  await chrome.tabs.create({
    url: chrome.runtime.getURL('phaseComplete.html'),
    index: tab ? tab.index + 1 : undefined,
    active: true
  });
}

export function startTimer(type: TimerType) {
  const duration = getTimerDuration(type);
  const endTime = Date.now() + duration * 1000;

  updateTimerState({
    isRunning: true,
    isPaused: false,
    type,
    endTime,
    remainingTime: duration
  });

  // Notify all tabs that timer has started
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        try {
          chrome.tabs.sendMessage(tab.id, { action: 'timerStarted' });
        } catch {
          // Ignore errors from tabs that don't have listeners
        }
      }
    });
  });

  startTimerInterval();
}

export function stopTimer() {
  try {
    updateTimerState({
      isRunning: false,
      isPaused: false,
      type: null,
      endTime: null,
      remainingTime: null
    });
    
    clearBadge();
    return notifyStateChanged();
  } catch (error) {
    console.error('Error stopping timer:', error);
    return Promise.reject(error);
  }
}

export function pauseTimer() {
  try {
    if (!currentTimer.isRunning) return;
    
    const remaining = calculateRemainingTime(currentTimer.endTime);
    if (remaining === null) {
      throw new TimerError('Cannot pause timer: Invalid remaining time');
    }

    updateTimerState({
      isRunning: false,
      isPaused: true,
      remainingTime: remaining
    });

    updateBadge(currentTimer);
    return notifyStateChanged();
  } catch (error) {
    console.error('Error pausing timer:', error);
    stopTimer();
    return Promise.reject(error);
  }
}

export function resumeTimer() {
  try {
    if (currentTimer.isRunning || !currentTimer.remainingTime || !currentTimer.type) {
      throw new TimerError('Cannot resume timer: Invalid timer state');
    }
    
    updateTimerState({
      isRunning: true,
      isPaused: false,
      endTime: Date.now() + (currentTimer.remainingTime * 1000)
    });
    
    updateBadge(currentTimer);
    startTimerInterval();
    return notifyStateChanged();
  } catch (error) {
    console.error('Error resuming timer:', error);
    stopTimer();
    return Promise.reject(error);
  }
}

function startTimerInterval() {
  const intervalId = setInterval(() => {
    try {
      if (!currentTimer.isRunning || !currentTimer.endTime) {
        clearInterval(intervalId);
        return;
      }

      const remaining = calculateRemainingTime(currentTimer.endTime);
      
      if (remaining === 0) {
        const completedType = currentTimer.type;
        if (completedType) {
          handleTimerComplete(completedType);
        }
        stopTimer();
        clearInterval(intervalId);
        openTimerCompletePage().catch(error => {
          console.error('Error opening timer complete page:', error);
        });
      } else if (remaining === null) {
        throw new TimerError('Invalid remaining time calculated');
      } else {
        updateTimerState({ remainingTime: remaining });
        updateBadge(currentTimer);
      }
    } catch (error) {
      console.error('Error in timer interval:', error);
      clearInterval(intervalId);
      stopTimer();
    }
  }, TIMER_UPDATE_INTERVAL);
}

function handleTimerComplete(type: TimerType) {
  const updates: Partial<TimerState> = {
    lastCompletedType: type
  };
  
  if (type === 'focus') {
    const newFocusSessionsCompleted = currentTimer.focusSessionsCompleted + 1;
    updates.focusSessionsCompleted = newFocusSessionsCompleted;
    
    if (newFocusSessionsCompleted >= FOCUS_SESSIONS_BEFORE_LONG_BREAK) {
      updates.totalCycles = currentTimer.totalCycles + 1;
    }
  } else if (type === 'long-break' && currentTimer.focusSessionsCompleted >= FOCUS_SESSIONS_BEFORE_LONG_BREAK) {
    updates.focusSessionsCompleted = 0;
  }
  
  updateTimerState(updates);
  notifyTimerComplete(type);
}

function saveTimerState() {
  chrome.storage.local.set({ timer: currentTimer }).catch(error => {
    console.error('Error saving timer state:', error);
  });
}

export function initializeTimer() {
  chrome.storage.local.get(['timer'], (result) => {
    try {
      if (result.timer && validateTimerState(result.timer)) {
        updateTimerState({
          ...defaultTimerState,
          ...result.timer
        });
        
        if (currentTimer.isRunning) {
          updateBadge(currentTimer);
          startTimerInterval();
        }
      } else {
        console.warn('Invalid timer state in storage, resetting to default');
        updateTimerState(defaultTimerState);
      }
    } catch (error) {
      console.error('Error initializing timer:', error);
      updateTimerState(defaultTimerState);
    }
  });
}

function notifyStateChanged() {
  return initializeContextMenu().catch(error => {
    console.error('Error updating context menu:', error);
  });
} 