import React from 'react';
import EmptyState from './EmptyState';
import { DistributionProps } from './interfaces';

const Heatmap: React.FC<DistributionProps> = ({ pomodoroHistory }) => {
  const totalSessions = pomodoroHistory?.completion_timestamps.length ?? 0;
  const title = totalSessions > 0 
    ? `${totalSessions} Pomodoros in the Last 9 Months`
    : 'No Pomodoros in the Last 9 Months';

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-gray-700">{title}</h2>
      </div>

      <EmptyState message="Finish a Pomodoro to see your history" />
    </div>
  );
};

export default Heatmap; 