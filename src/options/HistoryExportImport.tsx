import React, { useState, useEffect } from 'react';
import { PomodoroHistory } from "../background/core/pomodoro-history";

interface HistoryExportImportProps {
  pomodoroHistory: PomodoroHistory | null;
}

const HistoryExportImport: React.FC<HistoryExportImportProps> = ({ pomodoroHistory }) => {
  const handleExport = () => {
    if (!pomodoroHistory) {
      console.warn('No history data available to export');
      return;
    }

    // Create the export data object using actual history data
    const exportData = {
      durations: pomodoroHistory.durations.map(d => d.value),
      pomodoros: pomodoroHistory.completion_timestamps,
      timezones: pomodoroHistory.timezones.map(t => t.value),
      version: pomodoroHistory.version
    };

    // Convert the data to a JSON string
    const jsonString = JSON.stringify(exportData);

    // Create a blob with the JSON data
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pomodoro_history.json';

    // Append the link to the body
    document.body.appendChild(link);

    // Trigger the download
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvExport = () => {
    if (!pomodoroHistory) {
      console.warn('No history data available to export');
      return;
    }

    // CSV Header
    const csvRows = ['End (ISO 8601),End Date,End Time (24 Hour),End Timestamp (Unix),End Timezone (UTC Offset Minutes),Duration (Seconds)'];

    // Create rows for each pomodoro session
    let durationIndex = 0;
    let sessionsRemainingForDuration = 0;
    let currentDuration = 0;

    pomodoroHistory.completion_timestamps.forEach((timestamp, index) => {
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

    // Create and download the CSV file
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pomodoro_history.csv';
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

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-0.5">
        <h2 className="text-sm text-gray-700 font-normal">Your History</h2>
      </div>
      <div className="w-full border-b border-gray-200 mb-4"></div>

      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleCsvExport}
            className="flex-none w-[185px] text-[15px] cursor-pointer bg-transparent text-[#555] px-[10px] py-[10px] border border-[#555] rounded-[40px] hover:text-[#a00] hover:border-[#a00] focus:outline-none"
          >
            Save as CSV
          </button>
          <span className="text-sm text-gray-600">Use with Excel, Google Sheets, or other spreadsheet software.</span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleExport}
            className="flex-none w-[185px] text-[15px] cursor-pointer bg-transparent text-[#555] px-[10px] py-[10px] border border-[#555] rounded-[40px] hover:text-[#a00] hover:border-[#a00] focus:outline-none"
          >
            Export
          </button>
          <span className="text-sm text-gray-600">For backup or for importing on another computer.</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex-none w-[185px] text-[15px] cursor-pointer bg-transparent text-[#555] px-[10px] py-[10px] border border-[#555] rounded-[40px] hover:text-[#a00] hover:border-[#a00] focus:outline-none">
            Import
          </button>
          <span className="text-sm text-gray-600">Import & merge Pomodoro history from an exported file.</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex-none w-[185px] text-[15px] cursor-pointer bg-transparent text-[#555] px-[10px] py-[10px] border border-[#555] rounded-[40px] hover:text-[#a00] hover:border-[#a00] focus:outline-none">
            Clear History
          </button>
          <span className="text-sm text-gray-600">Permanently delete all Pomodoro history.</span>
        </div>
      </div>

    </div>
  );
};

export default HistoryExportImport;