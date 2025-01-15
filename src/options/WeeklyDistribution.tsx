import React from 'react';
import EmptyState from './EmptyState';
import { DistributionProps } from './interfaces';

const WeeklyDistribution: React.FC<DistributionProps> = ({ pomodoroHistory }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-gray-700">Weekly Distribution</h2>
      </div>

      <EmptyState message="Finish a Pomodoro to see your weekly stats" />
    </div>
  );
};

export default WeeklyDistribution; 