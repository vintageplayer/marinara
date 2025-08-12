import React, { createContext, useContext, useState, useEffect } from 'react';
import { PomodoroSettings, TimerState, TimerType, DEFAULT_SETTINGS } from '../background/core/pomodoro-settings';
import { settingsManager } from '../background/managers/settings-manager';

interface PomodoroContextType {
  settings: PomodoroSettings;
  currentTimer: TimerState | null;
  timerInfo: { type: TimerType; sessionsToday: number } | null;
  updateSettings: () => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [currentTimer, setCurrentTimer] = useState<TimerState | null>(null);
  const [timerInfo, setTimerInfo] = useState<{ type: TimerType; sessionsToday: number } | null>(null);

  const updateSettings = async () => {
    await settingsManager.waitForInitialization();
    setSettings(settingsManager.getSettings());
  };

  useEffect(() => {
    // Load initial settings
    updateSettings();

    // Get timer info
    chrome.runtime.sendMessage({ action: 'getNextPhaseInfo' }, (response: any) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting timer info:', chrome.runtime.lastError);
        // Set default timer info as fallback
        setTimerInfo({ type: 'focus', sessionsToday: 0 });
        return;
      }
      if (!response || 'error' in response) {
        console.error('Invalid response getting timer info:', response);
        // Set default timer info as fallback
        setTimerInfo({ type: 'focus', sessionsToday: 0 });
        return;
      }
      setTimerInfo(response as { type: TimerType; sessionsToday: number });
    });

    // Get current timer state
    chrome.runtime.sendMessage({ action: 'getCurrentTimer' }, (response: any) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting current timer:', chrome.runtime.lastError);
        return;
      }
      if (!response || 'error' in response) {
        console.error('Invalid response getting current timer:', response);
        return;
      }
      setCurrentTimer(response as TimerState);
    });

    // Listen for timer state changes
    const handleMessage = (message: any) => {
      if (message.action === 'timerStateChanged') {
        setCurrentTimer(message.state as TimerState);
      } else if (message.action === 'settingsChanged') {
        updateSettings();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const value = {
    settings,
    currentTimer,
    timerInfo,
    updateSettings
  };

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoroContext() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoroContext must be used within a PomodoroProvider');
  }
  return context;
} 