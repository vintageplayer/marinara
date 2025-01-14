import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from 'react-router';
import { TimerState } from "../background/core/pomodoro-settings";
import { PomodoroHistory, PomodoroStats, getHistoricalStats } from "../background/core/pomodoro-history";
import Header from "./Header";
import History from "./History";

const Options = () => {
  const [currentTimer, setCurrentTimer] = useState<TimerState | null>(null);
  const [pomodoroHistory, setPomodoroHistory] = useState<PomodoroHistory | null>(null);
  const [historicalStats, setHistoricalStats] = useState<PomodoroStats | null>(null);

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

  const SettingsContent = () => (
    <div className="mt-4 p-4 bg-gray-800 text-gray-300 rounded-lg max-w-2xl mx-auto">
      <h3 className="text-sm font-semibold mb-2 text-gray-400">Timer State Interface:</h3>          
      <h3 className="text-sm font-semibold mb-2 text-gray-400">Current Timer State:</h3>
      <pre className="text-xs font-mono whitespace-pre-wrap">
        {JSON.stringify(currentTimer, null, 2)}
      </pre>
    </div>
  );

  const FeedbackContent = () => (
    <div className="mt-4 p-4 bg-gray-800 text-gray-300 rounded-lg max-w-2xl mx-auto">
      <h3 className="text-sm font-semibold mb-2 text-gray-400">Feedback</h3>
      <p className="text-sm text-gray-400">Feedback form coming soon...</p>
    </div>
  );

  return (
    <div>
      <Header />
      <div className="p-8">
        <Routes>
          <Route path="settings" element={<SettingsContent />} />
          <Route 
            path="history" 
            element={<History pomodoroHistory={pomodoroHistory} historicalStats={historicalStats} />} 
          />
          <Route path="feedback" element={<FeedbackContent />} />
          <Route path="/" element={<Navigate to="history" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default Options;