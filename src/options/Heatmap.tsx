import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { format, startOfWeek, getDay, startOfMonth, addDays } from 'date-fns';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import EmptyState from './EmptyState';
import { DistributionProps } from './interfaces';

const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const cellSize = 15;
const colorCount = 4;
const cellClass = 'day';
const dx = 40;

const formatTooltipDate = (date: Date) => {
  const dayName = format(date, 'EEEE');
  const month = format(date, 'MMMM');
  const day = format(date, 'd');
  const year = format(date, 'yyyy');
  return `${dayName}, ${month} ${day}, ${year}`;
};

const formatTooltipValue = (count: number, date: Date) => {
  if (count === 0) {
    return `No Pomodoros on ${formatTooltipDate(date)}`;
  }
  return `${count === 1 ? '1 pomodoro' : `${count} pomodoros`} on ${formatTooltipDate(date)}`;
};

const getDateKey = (date: Date) => {
  return format(date, 'yyyy-MM-dd');
};

const parseTimestamp = (timestamp: number) => {
  // Convert minutes since epoch to milliseconds
  return new Date(timestamp * 60 * 1000);
};

const getFirstSundayOfMonth = (date: Date): Date => {
  const monthStart = startOfMonth(date);
  const dayOfWeek = getDay(monthStart);
  return dayOfWeek === 0 ? monthStart : addDays(monthStart, 7 - dayOfWeek);
};

const Heatmap: React.FC<DistributionProps> = ({ pomodoroHistory }) => {
  const heatmapRef = useRef<HTMLDivElement>(null);
  const totalSessions = pomodoroHistory?.completion_timestamps.length ?? 0;
  const title = totalSessions > 0 
    ? `${totalSessions} Pomodoros in the Last 9 Months`
    : 'No Pomodoros in the Last 9 Months';

  useEffect(() => {
    if (!heatmapRef.current || !pomodoroHistory?.completion_timestamps.length) {
      return;
    }

    console.log('Raw timestamps:', pomodoroHistory.completion_timestamps);

    // Convert timestamps to date counts
    const data: { [key: string]: number } = {};
    pomodoroHistory.completion_timestamps.forEach(timestamp => {
      const date = parseTimestamp(timestamp);
      const dateKey = getDateKey(date);
      data[dateKey] = (data[dateKey] || 0) + 1;
      console.log('Processing timestamp:', timestamp, 'Date:', date, 'Key:', dateKey, 'Count:', data[dateKey]);
    });

    console.log('Processed data:', data);

    const max = Math.max(...Object.values(data));
    console.log('Max value:', max);

    const formatColor = d3.scaleQuantize<string>()
      .domain([0, max])
      .range(d3.range(colorCount).map(d => `color${d}`));

    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const start = startOfWeek(d3.timeDay.offset(end, -270));
    const dayRange = d3.timeDays(start, end);
    const numColumns = Math.ceil(dayRange.length / 7);
    const width = numColumns * cellSize + dx + 40;

    // Clear previous content
    d3.select(heatmapRef.current).html('');

    // Determine month label positions
    const months: [number, Date][] = [];
    let active: number | null = null;
    const cursor = new Date(start);
    
    while (cursor < end) {
      const month = cursor.getMonth();
      if (active !== month) {
        const firstSunday = getFirstSundayOfMonth(cursor);
        if (firstSunday >= start && firstSunday < end) {
          const weekIndex = Math.floor((firstSunday.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
          months.push([weekIndex, new Date(cursor)]);
        }
        active = month;
      }
      cursor.setDate(cursor.getDate() + 7);
    }

    // Add month labels
    const monthsSvg = d3.select(heatmapRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', 17);

    monthsSvg.append('g')
      .attr('transform', 'translate(0,10)')
      .selectAll('.month')
      .data(months)
      .enter()
      .append('text')
      .attr('x', (d) => d[0] * cellSize + dx)
      .attr('class', 'label')
      .style('text-anchor', 'start')
      .text(d => format(d[1], 'MMM'));

    // Create main heatmap
    const heatmap = d3.select(heatmapRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', 110)
      .attr('class', 'color days')
      .append('g')
      .attr('transform', `translate(${dx},0)`);

    // Add day-of-week labels (left side)
    heatmap.selectAll('text.dow')
      .data([1, 3, 5].map(d => shortDays[d]))
      .enter()
      .append('text')
      .attr('transform', (d, i) => `translate(-7,${cellSize * 2 * (i + 1)})`)
      .style('text-anchor', 'end')
      .attr('class', 'label')
      .text(d => d);

    // Add day-of-week labels (right side)
    heatmap.selectAll('text.dow-right')
      .data([1, 3, 5].map(d => shortDays[d]))
      .enter()
      .append('text')
      .attr('transform', (d, i) => `translate(${numColumns * cellSize + 7},${cellSize * 2 * (i + 1)})`)
      .style('text-anchor', 'start')
      .attr('class', 'label')
      .text(d => d);

    // Add day cells
    heatmap.selectAll('.day')
      .data(dayRange)
      .enter()
      .append('rect')
      .attr('class', d => {
        const dateKey = getDateKey(d);
        const count = data[dateKey] || 0;
        const colorClass = count > 0 ? formatColor(count) : '';
        return count > 0 ? `${cellClass} ${colorClass}` : cellClass;
      })
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('x', (d) => {
        // Calculate weeks from the start date
        const diffTime = d.getTime() - start.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        const weekNumber = Math.floor(diffDays / 7);
        return weekNumber * cellSize;
      })
      .attr('y', (d) => d.getDay() * cellSize)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('data-tooltip', d => {
        const count = data[getDateKey(d)] || 0;
        return formatTooltipValue(count, d);
      });

    // Add color legend
    const legend = d3.select(heatmapRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', 20)
      .append('g');

    legend.selectAll('.legend-grid')
      .data(d3.range(colorCount + 1))
      .enter()
      .append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('x', d => d * (cellSize + 2) + dx)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('class', d => `day color${d - 1}`);

    // Initialize tooltips
    if (heatmapRef.current) {
      const tooltipElements = heatmapRef.current.querySelectorAll('[data-tooltip]');
      tippy(tooltipElements, {
        content: (reference: Element) => reference.getAttribute('data-tooltip') || '',
        allowHTML: true,
        theme: 'custom',
      });
    }

  }, [pomodoroHistory]);

  if (!totalSessions) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-gray-700">{title}</h2>
        </div>
        <EmptyState message="Finish a Pomodoro to see your history" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-0.5">
        <h2 className="text-sm text-gray-700 font-normal">{title}</h2>
      </div>
      <div className="w-full border-b border-gray-200 mb-4"></div>
      <div className="heatmap" ref={heatmapRef} />
      <style>{`
        .heatmap {
          font-size: 14px;
          margin-left: -10px;
        }
        .heatmap .day {
          fill: #eee;
          stroke: #fff;
          stroke-width: 2px;
          outline: 0 !important;
        }
        .heatmap .label {
          fill: #777;
        }
        .heatmap .color0 {
          fill: #c6e48b;
        }
        .heatmap .color1 {
          fill: #7bc96f;
        }
        .heatmap .color2 {
          fill: #239a3b;
        }
        .heatmap .color3 {
          fill: #196127;
        }
        .tippy-box[data-theme~='custom'] {
          background-color: #1f2937;
          color: white;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 4px;
        }
        .tippy-box[data-theme~='custom'] .tippy-arrow {
          color: #1f2937;
        }
      `}</style>
    </div>
  );
};

export default Heatmap; 