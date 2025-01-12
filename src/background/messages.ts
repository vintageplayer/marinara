import { TimerState } from './pomodoro-settings';
import { getCurrentTimer, handleClick, getNextTimerType } from './pomodoro-timer';
import { TimerError } from './timer-utils';

interface NextPhaseInfo {
  type: 'focus' | 'short-break' | 'long-break';
  sessionsToday: number;
}

type MessageAction = 
  | { action: 'getNextPhaseInfo' }
  | { action: 'getCurrentTimer' }
  | { action: 'handleClick' }
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
    ['getNextPhaseInfo', 'getCurrentTimer', 'handleClick', 'openHistory'].includes(action);
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
            const timer = getCurrentTimer();
            const nextType = getNextTimerType();
            
            sendResponse({
              type: nextType,
              sessionsToday: timer.focusSessionsCompleted
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
            sendResponse(getCurrentTimer());
          } catch (error) {
            console.error('Error getting current timer:', error);
            sendResponse({ 
              error: error instanceof Error ? error.message : 'Unknown error getting timer state'
            });
          }
          break;
        
        case 'handleClick':
          try {
            handleClick();
            sendResponse();
          } catch (error) {
            console.error('Error handling click:', error);
            sendResponse({ 
              error: error instanceof Error ? error.message : 'Unknown error handling click'
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