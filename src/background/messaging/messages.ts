import { TimerState } from '../core/pomodoro-settings';
import pomodoroTimer from '../core/pomodoro-timer';
import { TimerError } from '../core/timer-utils';

interface NextPhaseInfo {
  type: 'focus' | 'short-break' | 'long-break';
  sessionsToday: number;
}

type MessageAction = 
  | { action: 'getNextPhaseInfo' }
  | { action: 'getCurrentTimer' }
  | { action: 'toggleTimer' }
  | { action: 'openHistory' };

type MessageResponse<T extends MessageAction> = 
  T extends { action: 'getNextPhaseInfo' } ? NextPhaseInfo :
  T extends { action: 'getCurrentTimer' } ? TimerState :
  void;

interface ErrorResponse {
  error: string;
}

function isMessageAction(message: unknown): message is MessageAction {
  if (!message || typeof message !== 'object') return false;
  const { action } = message as { action: unknown };
  return typeof action === 'string' && 
    ['getNextPhaseInfo', 'getCurrentTimer', 'toggleTimer', 'openHistory'].includes(action);
}

export function initializeMessageHandlers() {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    try {
      if (!isMessageAction(message)) {
        throw new TimerError('Invalid message format');
      }

      switch (message.action) {
        case 'getNextPhaseInfo': {
          try {
            const timer = pomodoroTimer.getCurrentState();
            const nextType = pomodoroTimer.getNextType();
            
            sendResponse({
              type: nextType,
              sessionsToday: timer.sessionsToday
            });
          } catch (error) {
            console.error('Error getting next phase info:', error);
            sendResponse({ 
              error: error instanceof Error ? error.message : 'Unknown error getting next phase info'
            });
          }
          break;
        }
        
        case 'getCurrentTimer':
          try {
            sendResponse(pomodoroTimer.getCurrentState());
          } catch (error) {
            console.error('Error getting current timer:', error);
            sendResponse({ 
              error: error instanceof Error ? error.message : 'Unknown error getting timer state'
            });
          }
          break;
        
        case 'toggleTimer':
          try {
            pomodoroTimer.toggleTimerState();
            sendResponse();
          } catch (error) {
            console.error('Error toggling timer:', error);
            sendResponse({ 
              error: error instanceof Error ? error.message : 'Unknown error toggling timer'
            });
          }
          break;
        
        case 'openHistory':
          try {
            chrome.runtime.openOptionsPage();
            sendResponse();
          } catch (error) {
            console.error('Error opening history:', error);
            sendResponse({ 
              error: error instanceof Error ? error.message : 'Unknown error opening history'
            });
          }
          break;
          
        default:
          throw new TimerError(`Unknown action: ${(message as any).action}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : 'Unknown error handling message'
      });
    }
    return true;
  });
} 