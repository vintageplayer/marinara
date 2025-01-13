import React, { useEffect, useState } from "react";
import { TimerState } from "../background/core/pomodoro-settings";

const Options = () => {
  const [currentTimer, setCurrentTimer] = useState<TimerState | null>(null);

  useEffect(() => {
    // Get current timer state
    chrome.runtime.sendMessage({ action: 'getCurrentTimer' }, (response) => {
      if (!response || 'error' in response) {
        return;
      }
      setCurrentTimer(response);
    });
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
    </div>
  );
};

export default Options;