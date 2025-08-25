import React, { useState, useEffect } from 'react';
import EmptyState from './EmptyState';
import { DistributionProps } from './interfaces';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Bar, Tooltip, TooltipProps } from "recharts";
import { HistoryUtils } from '../background/utils/history-utils';

type DayShort = typeof DAYS[number];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const DAYS_FULL = {
  'Sun': 'Sunday',
  'Mon': 'Monday',
  'Tue': 'Tuesday',
  'Wed': 'Wednesday',
  'Thu': 'Thursday',
  'Fri': 'Friday',
  'Sat': 'Saturday'
} as const;

const WeeklyXAxisTick = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
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
);

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length || !label) return null;
  
  const count = payload[0].value;
  const day = label as DayShort;
  return (
    <div className="bg-gray-900 text-white px-2 py-1 rounded text-sm">
      <span>{count} {count === 1 ? 'Pomodoro' : 'Pomodoros'}</span>
      <span className="text-gray-300"> on {DAYS_FULL[day]}</span>
    </div>
  );
};

const getYAxisTicks = (maxValue: number) => {
  if (maxValue === 0) return [0, 1];
  const tickInterval = Math.ceil(maxValue / 4);
  return Array.from({ length: 5 }, (_, i) => i * tickInterval);
};

const WeeklyDistribution: React.FC<DistributionProps> = ({ pomodoroHistory }) => {
  const [chartData, setChartData] = useState<{ time: string; value: number }[] | null>(null);
  const [maxValue, setMaxValue] = useState<number>(0);

  useEffect(() => {
    if (!pomodoroHistory?.completion_timestamps.length) {
      setChartData(null);
      setMaxValue(0);
      return;
    }

    // Initialize counts for each day
    const dayCounts = DAYS.map(day => ({ time: day, value: 0 }));

    // Count pomodoros for each day - direct comparison like Heatmap
    pomodoroHistory.completion_timestamps.forEach(timestamp => {
      // Stored timestamps are already in UTC format
      // Create date directly for day classification
      const date = new Date(timestamp * 60 * 1000);
      dayCounts[date.getDay()].value++;
    });

    setMaxValue(Math.max(...dayCounts.map(d => d.value)));
    setChartData(dayCounts);
  }, [pomodoroHistory]);

  if (!chartData) {
    return (
      <div className="w-full">
        <h2 className="text-sm text-gray-700 font-normal mb-0.5">Weekly Distribution</h2>
        <div className="w-full border-b border-gray-200 mb-4" />
        <EmptyState message="Finish a Pomodoro to see your weekly stats" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-sm text-gray-700 font-normal mb-0.5">Weekly Distribution</h2>
      <div className="w-full border-b border-gray-200 mb-4" />
      <div className="h-[150px] w-full">
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            barCategoryGap={0.5}
          >
            <XAxis
              dataKey="time"
              axisLine={{ strokeWidth: 1 }}
              tick={WeeklyXAxisTick}
              interval={0}
              tickSize={0}
              padding={{ left: 20, right: 20 }}
            />
            <YAxis
              axisLine={{ strokeWidth: 1 }}
              tickLine={{ stroke: "#666", strokeWidth: 1 }}
              tick={{ fontSize: 12 }}
              ticks={getYAxisTicks(maxValue)}
              width={30}
            />
            <Tooltip 
              content={CustomTooltip}
              cursor={{ fill: 'transparent' }}
            />
            <Bar
              dataKey="value"
              barSize={40}
              fill="rgb(22, 163, 74)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeeklyDistribution; 