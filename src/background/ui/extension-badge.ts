import { TimerState, TimerType } from '../core/pomodoro-settings';

export function updateBadge(timer: TimerState) {
  if (!timer.timerType) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  updateBadgeColor(timer.timerType);
  updateBadgeText(timer);
}

function updateBadgeColor(type: TimerType) {
  const color = type === 'focus' ? '#ff0000' : '#00ff00';
  chrome.action.setBadgeBackgroundColor({ color });
}

function updateBadgeText(timer: TimerState) {
  if (timer.timerStatus === 'paused') {
    chrome.action.setBadgeText({ text: '-' });
    return;
  }

  if (timer.timerStatus === 'running' && timer.remainingTime) {
    const minutes = Math.ceil(timer.remainingTime / 60);
    const badgeText = timer.timerType === 'focus' && timer.remainingTime < 60
      ? '<1m'
      : `${minutes}m`;
    
    chrome.action.setBadgeText({ text: badgeText });
  }
}

export function clearBadge() {
  chrome.action.setBadgeText({ text: '' });
} 