import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from 'react-router';
import { PomodoroHistory, PomodoroStats, getHistoricalStats } from "../background/core/pomodoro-history";
import Header from "./Header";
import History from "./History";
import Settings from "./Settings";
import { PomodoroProvider } from '../context/PomodoroContext';

const Options = () => {
  const [pomodoroHistory, setPomodoroHistory] = useState<PomodoroHistory | null>(null);
  const [historicalStats, setHistoricalStats] = useState<PomodoroStats | null>(null);

  useEffect(() => {
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
            <Route path="/" element={<Navigate to="history" replace />} />
          </Routes>
        </div>
      </div>
    </PomodoroProvider>
  );
};

export default Options;