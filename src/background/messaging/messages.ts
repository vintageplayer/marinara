import { TimerState, TimerType } from '../core/pomodoro-settings';
import pomodoroTimer from '../core/pomodoro-timer';
import { TimerError } from '../core/timer-utils';
import { getHistoricalStats } from '../core/pomodoro-history';
import { debugLogger } from '../services/debug-logger';

interface NextPhaseInfo {
  type: TimerType;
  sessionsToday: number;
}

type MessageAction = 
  | { action: 'getNextPhaseInfo' }
  | { action: 'getCurrentTimer' }
  | { action: 'toggleTimer' }
  | { action: 'openHistory' }
  | { action: 'settingsChanged' }
  | { action: 'exportDebugLogs' }
  | { action: 'clearDebugLogs' }
  | { action: 'getDebugLogStats' };

type MessageResponse<T extends MessageAction> = 
  T extends { action: 'getNextPhaseInfo' } ? NextPhaseInfo :
  T extends { action: 'getCurrentTimer' } ? TimerState :
  T extends { action: 'exportDebugLogs' } ? string :
  T extends { action: 'getDebugLogStats' } ? { count: number; oldestLog?: string; newestLog?: string } :
  void;

interface ErrorResponse {
  error: string;
}

function isMessageAction(message: unknown): message is MessageAction {
  if (!message || typeof message !== 'object') return false;
  const { action } = message as { action: unknown };
  return typeof action === 'string' && 
    ['getNextPhaseInfo', 'getCurrentTimer', 'toggleTimer', 'openHistory', 'settingsChanged', 'exportDebugLogs', 'clearDebugLogs', 'getDebugLogStats'].includes(action);
}

export function initializeMessageHandlers() {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    try {
      if (!isMessageAction(message)) {
        throw new TimerError('Invalid message format');
      }

      switch (message.action) {
        case 'getNextPhaseInfo': {
          (async () => {
            try {
              const timer = pomodoroTimer.getCurrentState();
              const nextType = pomodoroTimer.getNextType();
              // Get today's sessions from historical data (single source of truth)
              const stats = await getHistoricalStats();
              console.log('[Messages] getNextPhaseInfo stats:', { daily: stats.daily, weekly: stats.weekly, monthly: stats.monthly });
              
              const response: NextPhaseInfo = {
                type: nextType,
                sessionsToday: stats.daily
              };
              sendResponse(response);
          } catch (error) {
            console.error('Error getting next phase info:', error);
            sendResponse({ 
              error: error instanceof Error ? error.message : 'Unknown error getting next phase info'
            });
          }
          })();
          return true; // Indicate async response
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
            debugLogger.log('Messages', 'toggleTimer', 'MESSAGE RECEIVED', {
              trigger: 'message-toggle-timer'
            });
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
            // Open options page to the history route
            const optionsUrl = chrome.runtime.getURL('options.html#/history');
            chrome.tabs.create({ url: optionsUrl });
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

        case 'exportDebugLogs':
          (async () => {
            try {
              const logs = await debugLogger.exportLogs();
              sendResponse(logs);
            } catch (error) {
              console.error('Error exporting debug logs:', error);
              sendResponse({ 
                error: error instanceof Error ? error.message : 'Unknown error exporting logs'
              });
            }
          })();
          return true;

        case 'clearDebugLogs':
          (async () => {
            try {
              await debugLogger.clearLogs();
              sendResponse();
            } catch (error) {
              console.error('Error clearing debug logs:', error);
              sendResponse({ 
                error: error instanceof Error ? error.message : 'Unknown error clearing logs'
              });
            }
          })();
          return true;

        case 'getDebugLogStats':
          (async () => {
            try {
              const stats = await debugLogger.getLogStats();
              sendResponse(stats);
            } catch (error) {
              console.error('Error getting debug log stats:', error);
              sendResponse({ 
                error: error instanceof Error ? error.message : 'Unknown error getting log stats'
              });
            }
          })();
          return true;
          
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