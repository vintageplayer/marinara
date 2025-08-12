import React from 'react';
import { TimerState, TimerType } from '../background/core/pomodoro-settings';
import { usePomodoroContext } from '../context/PomodoroContext';

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

function getNextPhaseToShow(timerInfo: { type: TimerType; sessionsToday: number } | null, currentTimer: TimerState | null): TimerType {
  // If there's a timer active (running or paused), use its type
  if (currentTimer && currentTimer.timerStatus !== 'stopped' && currentTimer.timerType) {
    return currentTimer.timerType;
  }

  // Otherwise use the next phase type
  return timerInfo?.type || 'focus';
}

export default function PhaseCompletion() {
  const { settings, currentTimer, timerInfo } = usePomodoroContext();

  // Show loading state if timerInfo is not available yet
  if (!timerInfo) {
    return (
      <div className="bg-white min-h-screen pt-[15vh] md:pt-[18vh] lg:pt-[20vh]">
        <div className="flex flex-col items-center gap-16">
          <div className="text-center">
            <h2 className="text-3xl font-medium mb-2">Loading...</h2>
            <div className="w-full h-px bg-gray-200 my-4" />
          </div>
        </div>
      </div>
    );
  }

  const nextPhaseType = getNextPhaseToShow(timerInfo, currentTimer);
  const isTimerRunning = currentTimer && currentTimer.timerStatus === 'running';
  const isTimerPaused = currentTimer && currentTimer.timerStatus === 'paused';

  const getPhaseText = () => {
    const phaseText = formatPhaseText(nextPhaseType);
    const action = isTimerRunning ? 'Pause' : isTimerPaused ? 'Resume' : 'Start';
    return `${action} ${phaseText}`;
  };

  const handleStartOrPause = () => {
    chrome.runtime.sendMessage({ action: 'toggleTimer' }, (response) => {
      if (response && 'error' in response) {
        return;
      }
    });
  };

  const handleViewHistory = () => {
    chrome.runtime.sendMessage({ action: 'openHistory' }, (response) => {
      if (response && 'error' in response) {
        return;
      }
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

  const getPomodorsUntilLongBreak = () => {
    if (!currentTimer) return 0;
    const interval = settings['long-break'].interval;
    if (interval === 0) return 0; // Long breaks are disabled
    // Use the cycle counter, not daily total
    return interval - (currentTimer.sessionsSinceLastLongBreak % interval);
  };

  return (
    <div className="bg-white min-h-screen pt-[15vh] md:pt-[18vh] lg:pt-[20vh]">
      <div className="flex flex-col items-center gap-16">
        <div className="text-center">
          <h2 className="text-3xl font-medium mb-2">
            {isTimerRunning ? formatPhaseText(nextPhaseType) : getPhaseText()}
          </h2>
          <div className="w-full h-px bg-gray-200 my-4" />
          { currentTimer && (
            <div className="text-gray-600 text-lg">
              {nextPhaseType === 'focus' && settings['long-break'].interval > 0 && (
                <span>
                  {getPomodorsUntilLongBreak()} {' '}
                  {getPomodorsUntilLongBreak() === 1 ? 'Pomodoro' : 'Pomodoros'} until long break -{' '}
                </span>
              )}
              {timerInfo.sessionsToday} {timerInfo.sessionsToday === 1 ? 'Pomodoro' : 'Pomodoros'} today
            </div>
          )}
        </div>

        <button
          onClick={handleStartOrPause}
          className={`px-8 py-3 text-white text-base font-medium rounded-full shadow-lg ${
            nextPhaseType === 'focus' 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {getPhaseText()}
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
      </div>
    </div>
  );
} 