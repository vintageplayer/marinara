import React, { useState, useEffect } from 'react';
import EmptyState from './EmptyState';
import { DistributionProps, ChartDataPoint } from './interfaces';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Bar } from "recharts";

const WeeklyXAxisTick = ({ x, y, payload, width }: any) => {
    return (
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
    )
  }

const getYAxisTicks = (maxValue: number) => {
    if (maxValue === 0) return [0, 1];
    else {
      const numberOfTicks = 4; // Reduced from 5 to show 5 intervals (0 to 4)
      const tickInterval = Math.ceil(maxValue / numberOfTicks);
      return Array.from({ length: numberOfTicks + 1 }, (_, index) => index * tickInterval);
    }
  };

const WeeklyDistribution: React.FC<DistributionProps> = ({ pomodoroHistory }) => {
    const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
    const [maxValue, setMaxValue] = useState<number>(0);

    const calculateDistribution = (): { distribution: ChartDataPoint[] | null; maxValue: number } => {
        if (!pomodoroHistory?.completion_timestamps.length) return { distribution: null, maxValue: 0 };

        // Initialize data array for all days of the week
        const distribution = Array.from({ length: 7 }, (_, index) => {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return {
                id: `day-${index}`,
                time: days[index],
                value: {
                    count: 0,
                    id: `day-${index}`
                }
            };
        });

        let maxValue = 0;

        // Fill distribution with completion counts
        pomodoroHistory.completion_timestamps.forEach(timestamp => {
            const date = new Date(timestamp * 60 * 1000); // Convert timestamp in minutes to milliseconds
            const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday
            distribution[dayIndex].value.count++;
            if (distribution[dayIndex].value.count > maxValue) {
                maxValue = distribution[dayIndex].value.count;
            }
        });

        return { distribution, maxValue };
    };

    useEffect(() => {
        const { distribution, maxValue } = calculateDistribution();
        setChartData(distribution);
        setMaxValue(maxValue);
    }, [pomodoroHistory]);

    return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-0.5">
        <h2 className="text-sm text-gray-700 font-normal">Weekly Distribution</h2>
      </div>

      <div className="w-full border-b border-gray-200 mb-4"></div>

      {!chartData ? (
        <EmptyState message="Finish a Pomodoro to see your weekly stats" />
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
              key={`chart-weekly`}
            >
              <XAxis
                dataKey="time"
                axisLine={{ strokeWidth: 1 }}
                interval={0}
                tickSize={0}
                padding={{ left: 20, right: 20 }}
                tick={(props) => <WeeklyXAxisTick {...props} width={610} />}
              />
              <YAxis
                axisLine={{ strokeWidth: 1 }}
                tickLine={{ stroke: "#666", strokeWidth: 1 }}
                tick={{ fontSize: 12 }}
                ticks={getYAxisTicks(maxValue)}
                width={30}
              />
              <Bar
                dataKey="value.count"
                barSize={40}
                fill="rgb(22, 163, 74)"
                key={`bar-weekly`}
                name={`weekly-intervals`}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default WeeklyDistribution; 