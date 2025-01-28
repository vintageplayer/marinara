import React, { useState, useEffect } from 'react';
import EmptyState from './EmptyState';
import { DistributionProps, ChartDataPoint } from './interfaces';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Bar, Tooltip } from "recharts";
import { format } from 'date-fns';

type TimeIntervalInMinutes = 15 | 30 | 60 | 120;

const availableTimeIntervals = [
  { displayName: "15 MIN", durationInMinutes: 15 },
  { displayName: "30 MIN", durationInMinutes: 30 }, 
  { displayName: "1 HR", durationInMinutes: 60 },
  { displayName: "2 HR", durationInMinutes: 120 }
];

const XAxisTickLineAndText = ({ tickText }: { tickText: string }) => {
  return (
    <>
    <line y2="6" stroke="#666" strokeWidth={1} />
    <text
      x={0}
      y={16}
      dy={4}
      textAnchor="middle"
      fill="#666"
      fontSize={12}
    >
      {tickText}
    </text>
    </>
  )
}

const HourlyXAxisTick = ({ x, y, payload, width, selectedInterval }: any) => {
  if (payload.value === undefined) return null;
  const numberOfBuckets = 24 * 60 / selectedInterval;
  const hourColumnWidth = width / numberOfBuckets; // Width of each hour column
  const isLastTick = payload.index === numberOfBuckets - 1;

  const time = JSON.parse(payload.value);
  
  return (
    <>
    { time.minutesInToTheHour == 0 && <g transform={`translate(${x - hourColumnWidth/2},${y})`}>
      <XAxisTickLineAndText tickText={time.hourWithAmPm} />
    </g>}
    { selectedInterval === 120 && <g transform={`translate(${x},${y})`}>
      <XAxisTickLineAndText tickText={time.nextHourWithAmPm} />
    </g>}
    {isLastTick && 
      <g transform={`translate(${x + hourColumnWidth/2},${y})`}>
        <XAxisTickLineAndText tickText={`12a`} />
      </g>
    }
    </>
  );
};

const getYAxisTicks = (maxValue: number) => {
  if (maxValue === 0) return [0, 1];
  else {
    const numberOfTicks = 4; // Reduced from 5 to show 5 intervals (0 to 4)
    const tickInterval = Math.ceil(maxValue / numberOfTicks);
    return Array.from({ length: numberOfTicks + 1 }, (_, index) => index * tickInterval);
  }
};

const formatTimeRange = (time: string, intervalInMinutes: number): string => {
  const { hourWithAmPm } = JSON.parse(time);
  const hour = parseInt(hourWithAmPm.slice(0, -1));
  const ampm = hourWithAmPm.slice(-1);
  
  const startTime = new Date();
  startTime.setHours(ampm === 'a' ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12));
  startTime.setMinutes(0);
  startTime.setSeconds(0);
  
  const endTime = new Date(startTime);
  endTime.setMinutes(startTime.getMinutes() + intervalInMinutes);

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:00${ampm}`;
  };
  
  return `${formatTime(startTime)}\u2014${formatTime(endTime)}`;
};

const CustomTooltip = ({ active, payload, label, selectedInterval }: any) => {
  if (active && payload && payload.length) {
    const count = payload[0].value;
    const timeRange = formatTimeRange(label, selectedInterval);
    return (
      <div className="bg-gray-900 text-white px-2 py-1 rounded text-sm">
        <span>{count} {count === 1 ? 'Pomodoro' : 'Pomodoros'}</span>
        <span className="text-gray-300"> between {timeRange}</span>
      </div>
    );
  }
  return null;
};

const DailyDistribution: React.FC<DistributionProps> = ({ pomodoroHistory }) => {
  const [selectedInterval, setSelectedInterval] = useState<TimeIntervalInMinutes>(60);
  const [chartData, setChartData] = useState<ChartDataPoint[] | null>(null);
  const [maxValue, setMaxValue] = useState<number>(0);

  const calculateDistribution = (): { distribution: ChartDataPoint[] | null; maxValue: number } => {
    if (!pomodoroHistory?.completion_timestamps.length) return { distribution: null, maxValue: 0 };

    const numberOfBuckets = 24 * 60 / selectedInterval;

    // Initialize data array for all intervals
    const distribution = Array.from({ length: numberOfBuckets }, (_, index) => {
      const minutesFromMidnight = index * selectedInterval;
      const hour = Math.floor(minutesFromMidnight / 60);
      const minutesInToTheHour = minutesFromMidnight % 60;

      const formatHour = (h: number) => {
        h = h % 24; // Normalize to 24-hour format
        const is12OrMidnight = h === 0 || h === 12;
        const hourIn12Format = is12OrMidnight ? 12 : h % 12;
        const amPmSuffix = h < 12 ? 'a' : 'p';
        return `${hourIn12Format}${amPmSuffix}`;
      };

      return {
        id: `${selectedInterval}-${index}`,
        time: JSON.stringify({
          hourWithAmPm: formatHour(hour),
          nextHourWithAmPm: formatHour(hour + 1), // Needed for 2hr interval
          minutesInToTheHour,
        }),
        value: {
          count: 0,
          id: `${selectedInterval}-${index}`
        }
      };
    });

    let maxValue = 0;
    const currentTimezoneOffset = new Date().getTimezoneOffset();

    // Fill distribution with completion counts based on selected interval
    pomodoroHistory.completion_timestamps.forEach(timestamp => {
      // Convert timestamp to milliseconds and adjust for timezone
      const timestampMs = timestamp * 60 * 1000;
      const adjustedTimestampMs = timestampMs - (currentTimezoneOffset * 60 * 1000);
      
      // Get day-relative milliseconds
      const dayRelativeMs = adjustedTimestampMs % (24 * 60 * 60 * 1000);
      
      // Calculate bucket index based on interval
      const bucketIndex = Math.floor(dayRelativeMs / (selectedInterval * 60 * 1000));
      
      if (bucketIndex >= 0 && bucketIndex < distribution.length) {
        distribution[bucketIndex].value.count++;
        if (distribution[bucketIndex].value.count > maxValue) {
          maxValue = distribution[bucketIndex].value.count;
        }
      }
    });

    return { distribution, maxValue };
  };

  useEffect(() => {
    const { distribution, maxValue } = calculateDistribution();
    setChartData(distribution);
    setMaxValue(maxValue);
  }, [pomodoroHistory, selectedInterval]);

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
              key={`chart-${selectedInterval}`}
            >
              <XAxis
                dataKey="time"
                axisLine={{ strokeWidth: 1 }}
                tick={(props) => <HourlyXAxisTick {...props} width={610} selectedInterval={selectedInterval} />}
                interval={0}
                tickSize={0}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis
                axisLine={{ strokeWidth: 1 }}
                tickLine={{ stroke: "#666", strokeWidth: 1 }}
                tick={{ fontSize: 12 }}
                ticks={getYAxisTicks(maxValue)}
                width={30}
              />
              <Tooltip 
                content={({ active, payload, label }) => (
                  <CustomTooltip 
                    active={active} 
                    payload={payload} 
                    label={label} 
                    selectedInterval={selectedInterval}
                  />
                )}
                cursor={{ fill: 'transparent' }}
              />
              <Bar
                dataKey="value.count"
                fill="rgb(22, 163, 74)"
                key={`bar-${selectedInterval}`}
                name={`${selectedInterval}min-intervals`}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default DailyDistribution;