import React, { useState } from 'react';
import EmptyState from './EmptyState';
import { DistributionProps } from './interfaces';

type Interval = 15 | 30 | 60 | 120;

const DailyDistribution: React.FC<DistributionProps> = ({ pomodoroHistory }) => {
  const [selectedInterval, setSelectedInterval] = useState<Interval>(60);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-gray-700">Daily Distribution</h2>
        <div className="flex gap-2">
          {[15, 30, 60, 120].map((interval) => (
            <button
              key={interval}
              onClick={() => setSelectedInterval(interval as Interval)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedInterval === interval
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {interval >= 60 ? `${interval / 60} HR` : `${interval} MIN`}
            </button>
          ))}
        </div>
      </div>

      <EmptyState message="Finish a Pomodoro to see your daily stats" />
    </div>
  );
};

export default DailyDistribution; 