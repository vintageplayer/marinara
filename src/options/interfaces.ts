import { PomodoroHistory, PomodoroStats } from "../background/core/pomodoro-history";

export interface HistoryProps {
  pomodoroHistory: PomodoroHistory | null;
  historicalStats: PomodoroStats | null;
}

export interface DistributionProps {
  pomodoroHistory: PomodoroHistory | null;
} 

export interface ChartDataPoint {
    id: string;
    time: string;
    value: {
      count: number;
      id: string;
    };
  }
  