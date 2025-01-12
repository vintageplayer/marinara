import React, { useEffect, useState } from 'react';
import { FOCUS_SESSIONS_BEFORE_LONG_BREAK, TimerState, TimerType } from '../background/pomodoro-settings';

interface TimerInfo {
  type: TimerType;
  sessionsToday: number;
}

function formatPhaseText(type: TimerType): string {
  switch (type) {
    case 'focus':
      return 'Focusing';
    case 'short-break':
      return 'Short Break';
    case 'long-break':
      return 'Long Break';
  }
}

function getPhaseToShow(timerInfo: TimerInfo, currentTimer: TimerState | null): TimerType {
  console.log('Timer Info:', timerInfo);
  console.log('Current Timer:', currentTimer);
  
  // If there's a timer running or paused, use its type
  if (currentTimer && (currentTimer.isRunning || currentTimer.isPaused) && currentTimer.type) {
    console.log('Using current timer type:', currentTimer.type);
    return currentTimer.type;
  }

  // For debugging, log the state that led to using next phase
  console.log('Using next phase type:', timerInfo.type);
  console.log('Last completed type:', currentTimer?.lastCompletedType);
  console.log('Focus sessions completed:', currentTimer?.focusSessionsCompleted);
  
  // Otherwise use the next phase type
  return timerInfo.type;
}

export default function PhaseCompletion() {
  const [timerInfo, setTimerInfo] = useState<TimerInfo | null>(null);
  const [currentTimer, setCurrentTimer] = useState<TimerState | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'getNextPhaseInfo' }, (response) => {
      if (!response) {
        console.error('No response received for next phase info');
        return;
      }
      if ('error' in response) {
        console.error('Error getting timer info:', response.error);
        return;
      }
      console.log('Next phase info response:', response);
      setTimerInfo(response);
    });

    chrome.runtime.sendMessage({ action: 'getCurrentTimer' }, (response) => {
      if (!response) {
        console.error('No response received for current timer');
        return;
      }
      if ('error' in response) {
        console.error('Error getting current timer:', response.error);
        return;
      }
      console.log('Current timer response:', response);
      setCurrentTimer(response);
    });
  }, []);

  if (!timerInfo) return null;

  const phaseType = getPhaseToShow(timerInfo, currentTimer);

  const handleStartNext = () => {
    chrome.runtime.sendMessage({ action: 'handleClick' }, (response) => {
      if (response && 'error' in response) {
        console.error('Error handling click:', response.error);
        return;
      }
      window.close();
    });
  };

  const handleViewHistory = () => {
    chrome.runtime.sendMessage({ action: 'openHistory' }, (response) => {
      if (response && 'error' in response) {
        console.error('Error opening history:', response.error);
        return;
      }
      window.close();
    });
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < timerInfo.sessionsToday; i++) {
      dots.push(
        <div 
          key={i}
          className="w-7 h-7 rounded-full bg-red-600"
        />
      );
    }
    return dots;
  };

  return (
    <div className="bg-white min-h-screen pt-[15vh] md:pt-[18vh] lg:pt-[20vh]">
      <div className="flex flex-col items-center gap-16">
        <div className="text-center">
          <h2 className="text-3xl font-medium mb-2">
            Start {formatPhaseText(phaseType)}
          </h2>
          <div className="w-full h-px bg-gray-200 my-4" />
          {timerInfo.sessionsToday > 0 && currentTimer && (
            <div className="text-gray-600 text-lg">
              {currentTimer.focusSessionsCompleted > 0 && phaseType != 'long-break' && (
                <span>{FOCUS_SESSIONS_BEFORE_LONG_BREAK - currentTimer.focusSessionsCompleted} Pomodoros until long break - </span>
              )}
              {timerInfo.sessionsToday} Pomodoros today
            </div>
          )}
        </div>

        <button
          onClick={handleStartNext}
          className={`px-8 py-3 text-white text-base font-medium rounded-full shadow-lg ${
            phaseType === 'focus' 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          Start {formatPhaseText(phaseType)}
        </button>

        <div className="text-center">
          <div className="flex justify-center space-x-3 mb-4">
            {renderDots()}
          </div>
          {timerInfo.sessionsToday > 0 && (
            <div className="text-gray-600 text-sm mb-4">
              Completed Today
            </div>
          )}
          <button
            onClick={handleViewHistory}
            className="text-gray-600 hover:text-gray-800 border border-black rounded-full px-6 py-1.5 text-sm"
          >
            View History
          </button>
        </div>

        {/* Debug section */}
        <div className="hidden mt-16 p-4 bg-gray-800 text-gray-300 rounded-lg max-w-2xl mx-auto">
          <h3 className="text-sm font-semibold mb-2 text-gray-400">Timer State Interface:</h3>          
          <h3 className="text-sm font-semibold mb-2 text-gray-400">Current Timer State:</h3>
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(currentTimer, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
} 