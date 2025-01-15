import { PomodoroHistory, PomodoroStats } from "../background/core/pomodoro-history";

export interface HistoryProps {
  pomodoroHistory: PomodoroHistory | null;
  historicalStats: PomodoroStats | null;
}

export interface DistributionProps {
  pomodoroHistory: PomodoroHistory | null;
} 