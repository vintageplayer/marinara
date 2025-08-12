import { TimerType, TimerSettings } from '../core/pomodoro-settings';
import { audioService } from '../services/audio-service';

export async function notifyTimerComplete(type: TimerType, settings: TimerSettings): Promise<void> {
  // Play notification sound if specified
  if (settings.notifications.sound && settings.notifications.sound !== '' && settings.notifications.sound !== null) {
    try {
      await audioService.playNotificationSound(settings.notifications.sound);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

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