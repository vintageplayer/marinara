import { initializeContextMenu } from './context-menu';
import { TimerState, TimerType, TIMER_DURATIONS, FOCUS_SESSIONS_BEFORE_LONG_BREAK } from './pomodoro-settings';
import { updateBadge, clearBadge } from './extension-badge';
import { notifyTimerComplete } from './completion-notifications';

// Current timer state
let currentTimer: TimerState = {
  isRunning: false,
  isPaused: false,
  type: null,
  endTime: null,
  remainingTime: null,
  focusSessionsCompleted: 0,
  totalCycles: 0
};

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

function getNextTimerType(): TimerType {
  const lastType = currentTimer.type;
  
  if (!lastType || lastType === 'long-break') {
    return 'focus';
  }
  
  if (lastType === 'focus') {
    // Long break after completing all focus sessions
    return currentTimer.focusSessionsCompleted >= FOCUS_SESSIONS_BEFORE_LONG_BREAK ? 'long-break' : 'short-break';
  }
  
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

export function startTimer(type: TimerType) {
  if (currentTimer.isRunning || currentTimer.isPaused) {
    stopTimer();
  }

  const duration = type === 'focus' 
    ? TIMER_DURATIONS.focus 
    : type === 'short-break' 
      ? TIMER_DURATIONS.shortBreak 
      : TIMER_DURATIONS.longBreak;

  currentTimer = {
    isRunning: true,
    isPaused: false,
    type,
    endTime: Date.now() + duration * 1000,
    remainingTime: duration,
    focusSessionsCompleted: currentTimer.focusSessionsCompleted,
    totalCycles: currentTimer.totalCycles
  };

  updateBadge(currentTimer);
  startTimerInterval();
  saveTimerState();
  return notifyStateChanged();
}

export function stopTimer() {
  currentTimer = {
    isRunning: false,
    isPaused: false,
    type: null,
    endTime: null,
    remainingTime: null,
    focusSessionsCompleted: currentTimer.focusSessionsCompleted,
    totalCycles: currentTimer.totalCycles
  };
  
  clearBadge();
  saveTimerState();
  return notifyStateChanged();
}

export function pauseTimer() {
  if (!currentTimer.isRunning) return;
  
  currentTimer.isRunning = false;
  currentTimer.isPaused = true;
  if (currentTimer.endTime) {
    currentTimer.remainingTime = Math.max(0, Math.floor((currentTimer.endTime - Date.now()) / 1000));
  }

  updateBadge(currentTimer);
  saveTimerState();
  return notifyStateChanged();
}

export function resumeTimer() {
  if (currentTimer.isRunning || !currentTimer.remainingTime || !currentTimer.type) return;
  
  currentTimer.isRunning = true;
  currentTimer.isPaused = false;
  currentTimer.endTime = Date.now() + (currentTimer.remainingTime * 1000);
  
  updateBadge(currentTimer);
  startTimerInterval();
  saveTimerState();
  return notifyStateChanged();
}

function startTimerInterval() {
  const intervalId = setInterval(() => {
    if (!currentTimer.isRunning || !currentTimer.endTime) {
      clearInterval(intervalId);
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, Math.floor((currentTimer.endTime - now) / 1000));
    
    if (remaining === 0) {
      const completedType = currentTimer.type;
      if (completedType) {
        handleTimerComplete(completedType);
      }
      stopTimer();
      clearInterval(intervalId);
    } else {
      currentTimer.remainingTime = remaining;
      updateBadge(currentTimer);
    }
  }, 1000);
}

function handleTimerComplete(type: TimerType) {
  if (type === 'focus') {
    currentTimer.focusSessionsCompleted++;
    if (currentTimer.focusSessionsCompleted >= FOCUS_SESSIONS_BEFORE_LONG_BREAK) {
      currentTimer.totalCycles++;
    }
  } else if (type === 'long-break' && currentTimer.focusSessionsCompleted >= FOCUS_SESSIONS_BEFORE_LONG_BREAK) {
    // Only reset after completing all focus sessions and the long break
    currentTimer.focusSessionsCompleted = 0;
  }
  notifyTimerComplete(type);
  saveTimerState();
}

function saveTimerState() {
  chrome.storage.local.set({ timer: currentTimer });
}

export function initializeTimer() {
  chrome.storage.local.get(['timer'], (result) => {
    if (result.timer) {
      currentTimer = result.timer;
      if (currentTimer.isRunning) {
        updateBadge(currentTimer);
        startTimerInterval();
      }
    }
  });
}

function notifyStateChanged() {
  return initializeContextMenu().catch(error => {
    console.error('Error updating context menu:', error);
  });
} 