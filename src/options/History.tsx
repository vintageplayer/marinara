import React from 'react';
import { PomodoroHistory } from "../background/core/pomodoro-history";
import DailyDistribution from './DailyDistribution';
import WeeklyDistribution from './WeeklyDistribution';
import Heatmap from './Heatmap';
import { HistoryProps } from './interfaces';
import HistoryExportImport from './HistoryExportImport';

const History: React.FC<HistoryProps> = ({ pomodoroHistory, historicalStats }) => {
  // Calculate total sessions - use unique timestamps count to match statistical calculations
  const getTotalSessions = (history: PomodoroHistory | null): number => {
    if (!history?.completion_timestamps) return 0;
    return [...new Set(history.completion_timestamps)].length;
  };

  const StatBox = ({ number, label, subtext }: { number: number, label: string, subtext?: string }) => (
    <div className="flex flex-col items-center">
      <div className="text-red-700 text-[30px] font-normal mb-2">
        {number}
      </div>
      <div className="text-gray-600 text-sm font-semibold">
        {label}
      </div>
      {subtext && (
        <div className="text-gray-500 text-sm">
          {subtext}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-4 space-y-8 max-w-2xl mx-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-white rounded-lg">
        <StatBox 
          number={historicalStats?.daily || 0} 
          label="Today" 
          subtext={`${historicalStats?.dailyAvg.toFixed(2) || "0.00"} avg`}
        />
        <StatBox 
          number={historicalStats?.weekly || 0} 
          label="This Week" 
          subtext={`${historicalStats?.weeklyAvg.toFixed(2) || "0.00"} avg`}
        />
        <StatBox 
          number={historicalStats?.monthly || 0} 
          label="In January" 
          subtext={`${historicalStats?.monthlyAvg.toFixed(2) || "0.00"} avg`}
        />
        <StatBox 
          number={getTotalSessions(pomodoroHistory)} 
          label="Total"
        />
      </div>

      {/* Distribution Charts */}
      <div className="space-y-8">
        <div className="bg-white rounded-lg p-4">
          <DailyDistribution pomodoroHistory={pomodoroHistory} />
        </div>
        <div className="bg-white rounded-lg p-4">
          <WeeklyDistribution pomodoroHistory={pomodoroHistory} />
        </div>
        <div className="bg-white rounded-lg p-4">
          <Heatmap pomodoroHistory={pomodoroHistory} />
        </div>
        <div className="bg-white rounded-lg p-4">
          <HistoryExportImport pomodoroHistory={pomodoroHistory} />
        </div>
      </div>

      {/* Debug Section */}
      <div className="p-4 bg-gray-800 text-gray-300 rounded-lg hidden">
        <h3 className="text-sm font-semibold mb-2 text-gray-400">Debug Data:</h3>
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {JSON.stringify(pomodoroHistory, null, 2)}
        </pre>
        {pomodoroHistory && pomodoroHistory.completion_timestamps.length > 0 && (
          <p className="text-sm text-gray-400 mt-2">
            Latest session: {new Date(pomodoroHistory.completion_timestamps[pomodoroHistory.completion_timestamps.length - 1] * 60000).toLocaleString()}
          </p>
        )}
        {historicalStats && (
          <div className="mt-2">
            <h4 className="text-sm font-semibold text-gray-400">Historical Stats Object:</h4>
            <pre className="text-xs font-mono whitespace-pre-wrap mt-1">
              {JSON.stringify(historicalStats, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default History; 