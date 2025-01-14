import React, { useEffect, useState } from "react";
import { TimerState } from "../background/core/pomodoro-settings";
import { PomodoroHistory, PomodoroStats, getHistoricalStats } from "../background/core/pomodoro-history";

const Options = () => {
  const [currentTimer, setCurrentTimer] = useState<TimerState | null>(null);
  const [pomodoroHistory, setPomodoroHistory] = useState<PomodoroHistory | null>(null);
  const [historicalStats, setHistoricalStats] = useState<PomodoroStats | null>(null);

  // Calculate total sessions from the counted values
  const getTotalSessions = (history: PomodoroHistory | null): number => {
    if (!history?.durations) return 0;
    return history.durations.reduce((total, curr) => total + curr.count, 0);
  };

  useEffect(() => {
    // Get current timer state
    chrome.runtime.sendMessage({ action: 'getCurrentTimer' }, (response) => {
      if (!response || 'error' in response) {
        return;
      }
      setCurrentTimer(response);
    });

    // Get pomodoro history
    chrome.storage.local.get('pomodoroHistory', (result) => {
      if (result.pomodoroHistory) {
        setPomodoroHistory(result.pomodoroHistory);
      }
    });

    // Get historical stats
    getHistoricalStats().then(setHistoricalStats);
  }, []);

  return (
    <div className="p-8">
      {/* Debug section */}
      <div className="mt-4 p-4 bg-gray-800 text-gray-300 rounded-lg max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold mb-2 text-gray-400">Timer State Interface:</h3>          
        <h3 className="text-sm font-semibold mb-2 text-gray-400">Current Timer State:</h3>
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {JSON.stringify(currentTimer, null, 2)}
        </pre>
      </div>

      {/* Pomodoro History section */}
      <div className="mt-4 p-4 bg-gray-800 text-gray-300 rounded-lg max-w-2xl mx-auto">
        <h3 className="text-sm font-semibold mb-2 text-gray-400">Pomodoro History:</h3>
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {JSON.stringify(pomodoroHistory, null, 2)}
        </pre>
        <div className="mt-4">
          <p className="text-sm text-gray-400">Total sessions: {getTotalSessions(pomodoroHistory)}</p>
          {pomodoroHistory && pomodoroHistory.completion_timestamps.length > 0 && (
            <p className="text-sm text-gray-400">
              Latest session: {new Date(pomodoroHistory.completion_timestamps[pomodoroHistory.completion_timestamps.length - 1] * 60000).toLocaleString()}
            </p>
          )}
          {historicalStats && (
            <>
              <div className="mt-2">
                <p className="text-sm text-gray-400">Today: {historicalStats.daily} sessions</p>
                <p className="text-sm text-gray-400">This week: {historicalStats.weekly} sessions</p>
                <p className="text-sm text-gray-400">This month: {historicalStats.monthly} sessions</p>
              </div>
              <div className="mt-2">
                <h4 className="text-sm font-semibold text-gray-400">Historical Stats Object:</h4>
                <pre className="text-xs font-mono whitespace-pre-wrap mt-1">
                  {JSON.stringify(historicalStats, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Options;