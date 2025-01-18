import React, { useState } from 'react';
import EmptyState from './EmptyState';
import { DistributionProps } from './interfaces';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Bar } from "recharts";

type TimeIntervalInMinutes = 15 | 30 | 60 | 120;

const availableTimeIntervals = [
  { displayName: "15 MIN", durationInMinutes: 15 },
  { displayName: "30 MIN", durationInMinutes: 30 }, 
  { displayName: "1 HR", durationInMinutes: 60 },
  { displayName: "2 HR", durationInMinutes: 120 }
];

const HourlyAxisTick = ({ x, y, payload, width }: any) => {
  if (payload.value === undefined) return null;
  const hourColumnWidth = width / 24; // Width of each hour column
  const isLastTick = payload.index === 23;
  
  return (
    <>
    <g transform={`translate(${x - hourColumnWidth/2},${y})`}>
      <line y2="6" stroke="#666" strokeWidth={1} />
      <text
        x={0}
        y={16}
        dy={4}
        textAnchor="middle"
        fill="#666"
        fontSize={12}
      >
        {payload.value}
      </text>
    </g>
    {isLastTick && 
      <g transform={`translate(${x + hourColumnWidth/2},${y})`}>
        <line y2="6" stroke="#666" strokeWidth={1} />
        <text
          x={0}
          y={16}
          dy={4}
          textAnchor="middle"
          fill="#666"
          fontSize={12}
        >
          12a
        </text>
      </g>
    }
    </>
  );
};

const DailyDistribution: React.FC<DistributionProps> = ({ pomodoroHistory }) => {
  const [selectedInterval, setSelectedInterval] = useState<TimeIntervalInMinutes>(30);

  const calculateDistribution = () => {
    if (!pomodoroHistory?.completion_timestamps.length) return null;

    const numberOfBuckets = 24 * 60 / selectedInterval;

    // Initialize data array for all intervals
    const distribution = Array.from({ length: numberOfBuckets }, (_, index) => {
      const minutesFromMidnight = index * selectedInterval;
      const hour = Math.floor(minutesFromMidnight / 60) % 24;
      const militaryHour = hour % 24;
      const twelveHourFormat = militaryHour === 0 || militaryHour === 12 ? 12 : militaryHour % 12;
      const amPmSuffix = militaryHour < 12 ? 'a' : 'p';
      return {
        time: `${twelveHourFormat}${amPmSuffix}`,
        value: 0
      };
    });

    // Fill distribution with completion counts based on selected interval
    pomodoroHistory.completion_timestamps.forEach(timestamp => {
      const date = new Date(timestamp * 60 * 1000); // Convert timestamp in minutes to milliseconds
      const minutesFromMidnight = date.getHours() * 60 + date.getMinutes();
      const bucketIndex = Math.floor(minutesFromMidnight / selectedInterval);
      if (bucketIndex < distribution.length) {
        distribution[bucketIndex].value++;
      }
    });

    return distribution;
  };

  const chartData = calculateDistribution();

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-0.5">
        <h2 className="text-sm text-gray-700 font-normal">Daily Distribution</h2>
        <div className="flex gap-2">
          {chartData && availableTimeIntervals.map((interval) => (
            <button
              key={interval.displayName}
              onClick={() => setSelectedInterval(interval.durationInMinutes as TimeIntervalInMinutes)}
              className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                selectedInterval === interval.durationInMinutes
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {interval.displayName}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full border-b border-gray-200 mb-4"></div>

      {!chartData ? (
        <EmptyState message="Finish a Pomodoro to see your daily stats" />
      ) : (
        <div className="h-[150px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 0,
              }}
              barCategoryGap={0.5}
            >
              <XAxis
                dataKey="time"
                axisLine={{ strokeWidth: 1 }}
                tick={(props) => <HourlyAxisTick {...props} width={610} />}
                interval={0}
                tickSize={0}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis
                axisLine={{ strokeWidth: 1 }}
                tickLine={{ stroke: "#666", strokeWidth: 1 }}
                tick={{ fontSize: 12 }}
                tickMargin={8}
                domain={[0, 3]}
                ticks={[0, 1, 2, 3]}
                width={30}
              />
              <Bar
                dataKey="value"
                fill="rgb(22, 163, 74)"
                radius={[2, 2, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DailyDistribution;