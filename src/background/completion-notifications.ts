import { TimerType } from './pomodoro-settings';

export function notifyTimerComplete(type: TimerType) {
  const title = type === 'focus' 
    ? 'Focus Session Complete!' 
    : 'Break Time Over!';
  
  const message = type === 'focus'
    ? 'Time for a break!'
    : 'Ready to focus again?';

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon.png'),
    title,
    message,
    priority: 2
  });
} 