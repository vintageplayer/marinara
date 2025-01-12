import { TimerState, TimerType } from './pomodoro-settings';

export function updateBadge(timer: TimerState) {
  if (!timer.type) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  updateBadgeColor(timer.type);
  updateBadgeText(timer);
}

function updateBadgeColor(type: TimerType) {
  const color = type === 'focus' ? '#ff0000' : '#00ff00';
  chrome.action.setBadgeBackgroundColor({ color });
}

function updateBadgeText(timer: TimerState) {
  if (timer.isPaused) {
    chrome.action.setBadgeText({ text: '-' });
    return;
  }

  if (timer.isRunning && timer.remainingTime) {
    const minutes = Math.ceil(timer.remainingTime / 60);
    const badgeText = timer.type === 'focus' && timer.remainingTime < 60
      ? '<1m'
      : `${minutes}m`;
    
    chrome.action.setBadgeText({ text: badgeText });
  }
}

export function clearBadge() {
  chrome.action.setBadgeText({ text: '' });
} 