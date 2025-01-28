import React from 'react';
import { PomodoroHistory, clearSessionHistory } from "../background/core/pomodoro-history";

interface HistoryExportImportProps {
  pomodoroHistory: PomodoroHistory | null;
}

interface HistoryButton {
  label: string;
  description: string;
  onClick?: () => void;
}

interface ExportData {
  durations: number[];
  pomodoros: number[];
  timezones: number[];
  version: number;
}

// Constants
const BUTTON_STYLE = "flex-none w-[185px] text-[15px] cursor-pointer bg-transparent text-[#555] px-[10px] py-[10px] border border-[#555] rounded-[40px] hover:text-[#a00] hover:border-[#a00] focus:outline-none";
const CSV_HEADER = 'End (ISO 8601),End Date,End Time (24 Hour),End Timestamp (Unix),End Timezone (UTC Offset Minutes),Duration (Seconds)';
const CLEAR_HISTORY_CONFIRMATION = 'Permanently delete all Pomodoro history?';

const HistoryButton: React.FC<HistoryButton> = ({ label, description, onClick }) => (
  <div className="flex items-center gap-4">
    <button 
      onClick={onClick}
      className={BUTTON_STYLE}
    >
      {label}
    </button>
    <span className="text-sm text-gray-600">{description}</span>
  </div>
);

const HistoryExportImport: React.FC<HistoryExportImportProps> = ({ pomodoroHistory }) => {
  // Helper function to download a file
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper function to format timezone offset
  const formatTimezoneOffset = (offsetInMinutes: number): string => {
    const sign = offsetInMinutes <= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetInMinutes);
    const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
    const minutes = (absOffset % 60).toString().padStart(2, '0');
    return `${sign}${hours}:${minutes}`;
  };

  const createExportData = (): ExportData | null => {
    if (!pomodoroHistory) {
      console.warn('No history data available to export');
      return null;
    }

    return {
      durations: pomodoroHistory.durations.map(d => d.value),
      pomodoros: pomodoroHistory.completion_timestamps,
      timezones: pomodoroHistory.timezones.map(t => t.value),
      version: pomodoroHistory.version
    };
  };

  const handleExport = () => {
    const exportData = createExportData();
    if (!exportData) return;

    const jsonString = JSON.stringify(exportData);
    downloadFile(jsonString, 'pomodoro_history.json', 'application/json');
  };

  const createCsvContent = (): string | null => {
    if (!pomodoroHistory) {
      console.warn('No history data available to export');
      return null;
    }

    const csvRows = [CSV_HEADER];
    let durationIndex = 0;
    let sessionsRemainingForDuration = 0;
    let currentDuration = 0;

    pomodoroHistory.completion_timestamps.forEach(timestamp => {
      // Get the duration for this timestamp
      if (sessionsRemainingForDuration === 0) {
        if (durationIndex < pomodoroHistory.durations.length) {
          currentDuration = pomodoroHistory.durations[durationIndex].value;
          sessionsRemainingForDuration = pomodoroHistory.durations[durationIndex].count;
          durationIndex++;
        }
      }

      // Get timezone offset for this timestamp
      const timezoneOffset = pomodoroHistory.timezones.length > 0 ? 
        pomodoroHistory.timezones[pomodoroHistory.timezones.length - 1].value : 
        new Date().getTimezoneOffset();

      // Convert timestamp (in minutes) to Date object
      const date = new Date(timestamp * 60000);
      
      // Format the row data
      const isoDate = date.toISOString().replace('Z', formatTimezoneOffset(timezoneOffset));
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().split(' ')[0];
      
      const row = [
        isoDate,
        dateStr,
        timeStr,
        timestamp * 60,
        timezoneOffset,
        currentDuration * 60
      ].join(',');

      csvRows.push(row);
      sessionsRemainingForDuration--;
    });

    return csvRows.join('\n');
  };

  const handleCsvExport = () => {
    const csvContent = createCsvContent();
    if (!csvContent) return;

    downloadFile(csvContent, 'pomodoro_history.csv', 'text/csv;charset=utf-8;');
  };

  const handleClearHistory = async () => {
    if (confirm(CLEAR_HISTORY_CONFIRMATION)) {
      await clearSessionHistory();
      window.location.reload();
    }
  };

  const buttons: HistoryButton[] = [
    {
      label: 'Save as CSV',
      description: 'Use with Excel, Google Sheets, or other spreadsheet software.',
      onClick: handleCsvExport
    },
    {
      label: 'Export',
      description: 'For backup or for importing on another computer.',
      onClick: handleExport
    },
    {
      label: 'Import',
      description: 'Import & merge Pomodoro history from an exported file.'
    },
    {
      label: 'Clear History',
      description: 'Permanently delete all Pomodoro history.',
      onClick: handleClearHistory
    }
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-0.5">
        <h2 className="text-sm text-gray-700 font-normal">Your History</h2>
      </div>
      <div className="w-full border-b border-gray-200 mb-4"></div>

      <div className="space-y-2">
        {buttons.map((button, index) => (
          <HistoryButton
            key={index}
            label={button.label}
            description={button.description}
            onClick={button.onClick}
          />
        ))}
      </div>
    </div>
  );
};

export default HistoryExportImport;