import { TimerState, TimerType } from '../core/pomodoro-settings';
import pomodoroTimer from '../core/pomodoro-timer';
import { TimerError } from '../core/timer-utils';

interface NextPhaseInfo {
  type: TimerType;
  sessionsToday: number;
}

type MessageAction = 
  | { action: 'getNextPhaseInfo' }
  | { action: 'getCurrentTimer' }
  | { action: 'toggleTimer' }
  | { action: 'openHistory' }
  | { action: 'settingsChanged' };

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
    ['getNextPhaseInfo', 'getCurrentTimer', 'toggleTimer', 'openHistory', 'settingsChanged'].includes(action);
}

export function initializeMessageHandlers() {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    try {
      if (!isMessageAction(message)) {
        throw new TimerError('Invalid message format');
      }

      switch (message.action) {
        case 'getNextPhaseInfo': {
          try {
            const timer = pomodoroTimer.getCurrentState();
            const nextType = pomodoroTimer.getNextType();
            
            const response: NextPhaseInfo = {
              type: nextType,
              sessionsToday: timer.sessionsToday
            };
            sendResponse(response);
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
            const state = pomodoroTimer.getCurrentState();
            sendResponse(state);
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

        case 'settingsChanged':
          try {
            // Broadcast settings change to all listeners
            try {
              chrome.runtime.sendMessage({ action: 'settingsChanged' });
            } catch (broadcastError) {
              // Ignore errors when no listeners are available
            }
            sendResponse();
          } catch (error) {
            console.error('Error broadcasting settings change:', error);
            sendResponse({ 
              error: error instanceof Error ? error.message : 'Unknown error broadcasting settings change'
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