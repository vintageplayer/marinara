import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from 'react-router';
import { PomodoroHistory, PomodoroStats, getHistoricalStats } from "../background/core/pomodoro-history";
import Header from "./Header";
import History from "./History";
import Settings from "./Settings";
import Feedback from "./Feedback";
import { PomodoroProvider } from '../context/PomodoroContext';

const Options = () => {
  const [pomodoroHistory, setPomodoroHistory] = useState<PomodoroHistory | null>(null);
  const [historicalStats, setHistoricalStats] = useState<PomodoroStats | null>(null);

  const refreshHistoryData = async () => {
    // Get pomodoro history
    chrome.storage.local.get('pomodoroHistory', (result) => {
      if (result.pomodoroHistory) {
        setPomodoroHistory(result.pomodoroHistory);
      }
    });

    // Get historical stats
    const stats = await getHistoricalStats();
    setHistoricalStats(stats);
  };

  useEffect(() => {
    // Initial load
    refreshHistoryData();

    // Listen for storage changes (when history is updated)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.pomodoroHistory) {
        console.log('[Options] History storage changed, refreshing data');
        refreshHistoryData();
      }
    };

    // Add storage listener
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <PomodoroProvider>
      <div>
        <Header />
        <div className="p-8">
          <Routes>
            <Route path="settings" element={<Settings />} />
            <Route 
              path="history" 
              element={<History pomodoroHistory={pomodoroHistory} historicalStats={historicalStats} />} 
            />
            <Route path="feedback" element={<Feedback />} />
            <Route path="/" element={<Navigate to="settings" replace />} />
          </Routes>
        </div>
      </div>
    </PomodoroProvider>
  );
};

export default Options;