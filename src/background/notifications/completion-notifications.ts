import { TimerType, TimerSettings } from '../core/pomodoro-settings';

export function notifyTimerComplete(type: TimerType, settings: TimerSettings) {
  // Only show desktop notification if enabled in settings
  if (!settings.notifications.desktop) {
    return;
  }

  const title = type === 'focus' 
    ? 'Focus Session Complete!' 
    : 'Break Time Over!';
  
  const message = type === 'focus'
    ? 'Time for a break!'
    : 'Ready to focus again?';

  chrome.notifications.create('pomodoro-complete', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title,
    message,
    priority: 2
  });
} 