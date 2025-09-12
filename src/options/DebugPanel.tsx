import React, { useState, useEffect } from 'react';

interface LogStats {
  count: number;
  oldestLog?: string;
  newestLog?: string;
}

export default function DebugPanel() {
  const [logStats, setLogStats] = useState<LogStats | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadLogStats = async () => {
    try {
      chrome.runtime.sendMessage({ action: 'getDebugLogStats' }, (response) => {
        if (response && typeof response === 'object' && !('error' in response)) {
          setLogStats(response as LogStats);
        }
      });
    } catch (error) {
      console.error('Error loading log stats:', error);
    }
  };

  useEffect(() => {
    loadLogStats();
  }, []);

  const handleExportLogs = async () => {
    setIsExporting(true);
    try {
      chrome.runtime.sendMessage({ action: 'exportDebugLogs' }, (response) => {
        try {
          if (response && typeof response === 'string') {
            // Create a downloadable file
            const blob = new Blob([response], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Debug logs exported successfully');
          } else {
            console.error('Error exporting logs:', response);
          }
        } finally {
          setIsExporting(false);
        }
      });
    } catch (error) {
      console.error('Error exporting logs:', error);
      setIsExporting(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all debug logs? This cannot be undone.')) {
      return;
    }
    
    setIsClearing(true);
    try {
      chrome.runtime.sendMessage({ action: 'clearDebugLogs' }, (response) => {
        try {
          if (!response || typeof response !== 'object' || !('error' in response)) {
            console.log('Debug logs cleared successfully');
            loadLogStats(); // Refresh stats
          } else {
            console.error('Error clearing logs:', response);
          }
        } finally {
          setIsClearing(false);
        }
      });
    } catch (error) {
      console.error('Error clearing logs:', error);
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Debug Logging</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-700 mb-2">Log Statistics</h3>
          {logStats ? (
            <div className="text-sm text-gray-600 space-y-1">
              <div>Total Entries: <span className="font-medium">{logStats.count}</span></div>
              {logStats.oldestLog && (
                <div>Oldest: <span className="font-medium">{new Date(logStats.oldestLog).toLocaleString()}</span></div>
              )}
              {logStats.newestLog && (
                <div>Newest: <span className="font-medium">{new Date(logStats.newestLog).toLocaleString()}</span></div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Loading...</div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-800 mb-2">How to Debug Duplicate Sessions</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Use the extension normally until duplicate sessions occur</li>
            <li>Export logs immediately after noticing the issue</li>
            <li>Look for multiple "SESSION ADDED SUCCESSFULLY" entries</li>
            <li>Check the call stack to identify which trigger caused duplicates</li>
            <li>Share the exported JSON file for analysis</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportLogs}
            disabled={isExporting || !logStats?.count}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Exporting...' : 'Export Logs'}
          </button>
          
          <button
            onClick={handleClearLogs}
            disabled={isClearing || !logStats?.count}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isClearing ? 'Clearing...' : 'Clear Logs'}
          </button>
          
          <button
            onClick={loadLogStats}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Refresh Stats
          </button>
        </div>
      </div>
    </div>
  );
}