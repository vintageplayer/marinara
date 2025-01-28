import React from 'react';
import { 
  PomodoroHistory, 
  clearSessionHistory, 
  ImportData, 
  mergeHistory, 
  createExportData,
  createCsvData,
  CsvRow
} from "../background/core/pomodoro-history";

interface HistoryExportImportProps {
  pomodoroHistory: PomodoroHistory | null;
}

interface HistoryButton {
  label: string;
  description: string;
  onClick?: () => void;
}

// Constants
const BUTTON_STYLE = "flex-none w-[185px] text-[15px] cursor-pointer bg-transparent text-[#555] px-[10px] py-[10px] border border-[#555] rounded-[40px] hover:text-[#a00] hover:border-[#a00] focus:outline-none";
const CSV_HEADER = 'End (ISO 8601),End Date,End Time (24 Hour),End Timestamp (Unix),End Timezone (UTC Offset Minutes),Duration (Seconds)';
const CLEAR_HISTORY_CONFIRMATION = 'Permanently delete all Pomodoro history?';
const MERGE_CONFIRMATION = 'Merge the imported history with your existing history?';

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

  // Helper function to read a file
  const readFile = async (acceptFileType: string): Promise<string | null> => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptFileType;
    input.style.cssText = 'display: none; width: 0; height: 0';

    let cancelTimeout: NodeJS.Timeout | null = null;
    let onBodyFocusIn: (() => void) | null = null;

    try {
      return await new Promise((resolve, reject) => {
        input.onchange = e => {
          if (cancelTimeout) clearTimeout(cancelTimeout);

          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve(null);
            return;
          }

          const reader = new FileReader();
          reader.onload = f => {
            resolve(f.target?.result as string);
          };

          reader.readAsText(file);
        };

        input.onabort = () => resolve(null);
        input.onclose = () => resolve(null);
        input.oncancel = () => resolve(null);
        input.onerror = e => reject(e);

        // Handle file dialog cancellation
        onBodyFocusIn = () => {
          if (!cancelTimeout) {
            cancelTimeout = setTimeout(() => {
              if (input.value.length === 0) {
                resolve(null);
              }
            }, 5000);
          }
        };

        document.body.addEventListener('focusin', onBodyFocusIn);
        document.body.appendChild(input);
        input.click();
      });
    } finally {
      document.body.removeChild(input);
      if (onBodyFocusIn) {
        document.body.removeEventListener('focusin', onBodyFocusIn);
      }
    }
  };

  const handleExport = () => {
    if (!pomodoroHistory) {
      console.warn('No history data available to export');
      return;
    }

    const exportData = createExportData(pomodoroHistory);
    const jsonString = JSON.stringify(exportData);
    downloadFile(jsonString, 'pomodoro_history.json', 'application/json');
  };

  const handleCsvExport = () => {
    if (!pomodoroHistory) {
      console.warn('No history data available to export');
      return;
    }

    const rows = createCsvData(pomodoroHistory);
    const csvRows = [
      CSV_HEADER,
      ...rows.map(row => [
        row.isoDate,
        row.dateStr,
        row.timeStr,
        row.timestamp,
        row.timezoneOffset,
        row.duration
      ].join(','))
    ];

    downloadFile(csvRows.join('\n'), 'pomodoro_history.csv', 'text/csv;charset=utf-8;');
  };

  const handleImport = async () => {
    try {
      const content = await readFile('.json');
      if (!content) return;

      let importedData: ImportData;
      try {
        importedData = JSON.parse(content);
      } catch (e) {
        alert('Invalid JSON file format');
        return;
      }

      // Validate imported data structure
      if (!importedData.durations || !importedData.pomodoros || !importedData.timezones || !importedData.version) {
        alert('Invalid history file format');
        return;
      }

      if (!confirm(MERGE_CONFIRMATION)) return;

      // Merge the imported history with existing history
      await mergeHistory(importedData);

      // Refresh the page to show updated history
      window.location.reload();
    } catch (error) {
      console.error('Error importing history:', error);
      alert('Error importing history file');
    }
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
      description: 'Import & merge Pomodoro history from an exported file.',
      onClick: handleImport
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