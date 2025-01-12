// Timer state interface
export interface TimerState {
  isRunning: boolean;
  type: 'focus' | 'short-break' | 'long-break' | null;
  endTime: number | null;
  remainingTime: number | null;
}

// Default durations in minutes
export const TIMER_DURATIONS = {
  focus: 1 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60 // 15 minutes
};

// Current timer state
let currentTimer: TimerState = {
  isRunning: false,
  type: null,
  endTime: null,
  remainingTime: null
};

export function startTimer(type: 'focus' | 'short-break' | 'long-break') {
  // Stop any existing timer
  if (currentTimer.isRunning) {
    stopTimer();
  }

  const duration = type === 'focus' 
    ? TIMER_DURATIONS.focus 
    : type === 'short-break' 
      ? TIMER_DURATIONS.shortBreak 
      : TIMER_DURATIONS.longBreak;

  currentTimer = {
    isRunning: true,
    type: type,
    endTime: Date.now() + duration * 1000,
    remainingTime: duration
  };

  // Update badge text
  updateBadge();

  // Start the timer update interval
  startTimerInterval();

  // Save timer state
  saveTimerState();
}

export function stopTimer() {
  currentTimer = {
    isRunning: false,
    type: null,
    endTime: null,
    remainingTime: null
  };
  
  // Clear badge
  chrome.action.setBadgeText({ text: '' });
  
  // Save timer state
  saveTimerState();
}

function updateBadge() {
  if (!currentTimer.isRunning || !currentTimer.remainingTime) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  const minutes = Math.ceil(currentTimer.remainingTime / 60);
  let badgeText = minutes.toString();
  
  // Show '<1' for focus sessions under 1 minute
  if (currentTimer.type === 'focus' && currentTimer.remainingTime < 60) {
    badgeText = '<1';
  }
  
  chrome.action.setBadgeText({ text: badgeText });
  
  // Set badge color based on timer type
  const color = currentTimer.type === 'focus' ? '#ff0000' : '#00ff00';
  chrome.action.setBadgeBackgroundColor({ color });
}

function startTimerInterval() {
  // Update timer every second
  const intervalId = setInterval(() => {
    if (!currentTimer.isRunning || !currentTimer.endTime) {
      clearInterval(intervalId);
      return;
    }

    const now = Date.now();
    const remaining = Math.max(0, Math.floor((currentTimer.endTime - now) / 1000));
    
    if (remaining === 0) {
      // Timer completed
      notifyTimerComplete();
      stopTimer();
      clearInterval(intervalId);
    } else {
      currentTimer.remainingTime = remaining;
      updateBadge();
    }
  }, 1000);
}

function notifyTimerComplete() {
  const title = currentTimer.type === 'focus' 
    ? 'Focus Session Complete!' 
    : 'Break Time Over!';
  
  const message = currentTimer.type === 'focus'
    ? 'Time for a break!'
    : 'Ready to focus again?';

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title: title,
    message: message,
    priority: 2
  });
}

function saveTimerState() {
  chrome.storage.local.set({ timer: currentTimer });
}

// Initialize timer state
export function initializeTimer() {
  chrome.storage.local.get(['timer'], (result) => {
    if (result.timer) {
      currentTimer = result.timer;
      if (currentTimer.isRunning) {
        updateBadge();
        startTimerInterval();
      }
    }
  });
} 