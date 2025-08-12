import { TimerType, TimerSettings } from '../core/pomodoro-settings';
import { audioService } from '../services/audio-service';
import { getHistoricalStats } from '../core/pomodoro-history';
import pomodoroTimer from '../core/pomodoro-timer';
import { settingsManager } from '../managers/settings-manager';

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

  // Get current state to determine next phase
  const currentState = pomodoroTimer.getCurrentState();
  const longBreakInterval = settingsManager.getLongBreakInterval();
  
  let title: string;
  if (type === 'focus') {
    // Focus session just completed, determine what break comes next
    const hasLongBreak = longBreakInterval > 0;
    const isLongBreakTime = hasLongBreak && currentState.sessionsSinceLastLongBreak >= longBreakInterval;
    
    if (isLongBreakTime) {
      title = 'Take a Long Break';
    } else if (hasLongBreak) {
      title = 'Take a Short Break';
    } else {
      title = 'Take a Break';
    }
  } else {
    // Break session just completed
    title = 'Start Focusing';
  }
  
  // Build message components like Marinara
  const messages: string[] = [];
  
  // Add "X until long break" if applicable (using same logic as PhaseCompletion)
  if (longBreakInterval > 0) {
    const pomodorosUntilLongBreak = longBreakInterval - (currentState.sessionsSinceLastLongBreak % longBreakInterval);
    if (pomodorosUntilLongBreak > 0) {
      const countText = pomodorosUntilLongBreak === 1 ? '1 Pomodoro' : `${pomodorosUntilLongBreak} Pomodoros`;
      messages.push(`${countText} until long break`);
    }
  }
  
  // Add "X today"
  const stats = await getHistoricalStats();
  const pomodorosToday = stats.daily;
  const todayText = pomodorosToday === 1 ? '1 Pomodoro' : `${pomodorosToday} Pomodoros`;
  messages.push(`${todayText} today`);
  
  const message = messages.join('\n');

  chrome.notifications.create('pomodoro-complete', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('images/128.png'),
    title,
    message,
    priority: 2
  });
} 