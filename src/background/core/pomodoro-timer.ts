import { TimerState, TimerType, FOCUS_SESSIONS_BEFORE_LONG_BREAK, TIMER_UPDATE_INTERVAL } from './pomodoro-settings';
import { CompletionHandler } from '../managers/completion-handler';
import { BadgeManager } from '../managers/badge-manager';
import { TimerStateStorage } from '../managers/timer-state-storage';
import { ContextMenuManager } from '../managers/context-menu-manager';
import { getHistoricalStats } from './pomodoro-history';
import { 
  getTimerDuration, 
  calculateRemainingTime, 
  TimerError,
  validateTimerState 
} from './timer-utils';

export class PomodoroTimer {
  private currentTimer: TimerState;
  private intervalId?: NodeJS.Timeout;
  private completionHandler: CompletionHandler;
  private badgeManager: BadgeManager;
  private stateStorage: TimerStateStorage;
  private contextMenuManager: ContextMenuManager;

  constructor() {
    this.currentTimer = this.createDefaultState();
    this.completionHandler = new CompletionHandler();
    this.badgeManager = new BadgeManager();
    this.stateStorage = new TimerStateStorage();
    this.contextMenuManager = new ContextMenuManager();
    this.initialize();
  }

  private createDefaultState(): TimerState {
    return {
      timerStatus: 'stopped',
      timerType: null,
      lastCompletedPhaseType: null,
      endTime: null,
      remainingTime: null,
      sessionsToday: 0,
      lastSessionDate: ''  // This will be set during initialization
    };
  }

  private async initialize(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    try {
      // Get today's sessions from history
      const stats = await getHistoricalStats();
      const todaysSessions = stats.daily;

      const storedState = await this.stateStorage.loadState();
      
      if (storedState) {
        // Check if we need to reset daily sessions (new day)
        const shouldResetDaily = storedState.lastSessionDate !== today;
        
        if (shouldResetDaily) {
          await this.updateState({
            ...storedState,
            sessionsToday: 0,
            lastSessionDate: today
          });
        } else {
          await this.updateState({
            ...storedState,
            sessionsToday: todaysSessions // Use the count from history
          });
        }
      } else {
        // No stored state, create a fresh one
        await this.updateState({
          ...this.createDefaultState(),
          lastSessionDate: today,
          sessionsToday: todaysSessions // Use the count from history
        });
      }

      // Start interval if timer was running
      if (this.currentTimer.timerStatus === 'running') {
        this.startInterval();
      }
    } catch (error) {
      console.error('Error initializing timer:', error);
      await this.updateState({
        ...this.createDefaultState(),
        lastSessionDate: today
      });
    }
  }

  private async updateState(timerStateUpdates: Partial<TimerState>): Promise<void> {
    try {
      const newTimerState = {
        ...this.currentTimer,
        ...timerStateUpdates,
      };

      // Ensure sessionsToday is never undefined or null
      if (typeof newTimerState.sessionsToday !== 'number') {
        newTimerState.sessionsToday = 0;
      }

      // Ensure lastSessionDate is never empty
      if (!newTimerState.lastSessionDate) {
        newTimerState.lastSessionDate = new Date().toISOString().split('T')[0];
      }

      if (!validateTimerState(newTimerState)) {
        throw new TimerError('Invalid timer state update');
      }

      this.currentTimer = newTimerState;
      
      // Notify all managers of state change
      this.badgeManager.handleStateChange(this.currentTimer);
      this.completionHandler.handleStateChange(this.currentTimer);
      await this.contextMenuManager.handleStateChange(this.currentTimer);
      await this.stateStorage.saveState(this.currentTimer);
    } catch (error) {
      console.error('Error updating timer state:', error);
      await this.updateState({
        ...this.createDefaultState(),
        lastSessionDate: new Date().toISOString().split('T')[0]
      });
    }
  }

  public async toggleTimerState(): Promise<void> {
    if (this.isRunning()) {
      await this.pause();
    } else if (this.isPaused()) {
      await this.resume();
    } else {
      await this.start(this.getNextType());
    }
  }

  public getNextType(): TimerType {
    const lastCompletedPhaseType = this.currentTimer.lastCompletedPhaseType;
    
    if (!lastCompletedPhaseType || lastCompletedPhaseType === 'long-break') {
      return 'focus';
    }

    if (lastCompletedPhaseType === 'focus') {
      return (this.currentTimer.sessionsToday % FOCUS_SESSIONS_BEFORE_LONG_BREAK === 0) 
        ? 'long-break' 
        : 'short-break';
    }
    
    return 'focus';
  }

  public async start(timerType: TimerType): Promise<void> {
    const duration = getTimerDuration(timerType);
    const endTime = Date.now() + duration * 1000;

    await this.updateState({
      timerStatus: 'running',
      timerType,
      endTime,
      remainingTime: duration
    });

    this.startInterval();
  }

  public async stop(): Promise<void> {
    try {
      await this.updateState({
        timerStatus: 'stopped',
        timerType: null,
        endTime: null,
        remainingTime: null
      });
    } catch (error) {
      await this.handleError('stopping timer', error);
    }
  }

  public async pause(): Promise<void> {
    try {
      if (!this.isRunning()) return;
      
      const remaining = calculateRemainingTime(this.currentTimer.endTime);
      if (remaining === null) {
        throw new TimerError('Cannot pause timer: Invalid remaining time');
      }

      await this.updateState({
        timerStatus: 'paused',
        remainingTime: remaining
      });
    } catch (error) {
      await this.handleError('pausing timer', error);
    }
  }

  public async resume(): Promise<void> {
    try {
      if (this.isRunning() || !this.currentTimer.remainingTime || !this.currentTimer.timerType) {
        throw new TimerError('Cannot resume timer: Invalid timer state');
      }
      
      await this.updateState({
        timerStatus: 'running',
        endTime: Date.now() + (this.currentTimer.remainingTime * 1000)
      });
      
      this.startInterval();
    } catch (error) {
      await this.handleError('resuming timer', error);
    }
  }

  public isRunning(): boolean {
    return this.currentTimer.timerStatus === 'running';
  }

  public isPaused(): boolean {
    return this.currentTimer.timerStatus === 'paused';
  }

  public getCurrentState(): TimerState {
    return { ...this.currentTimer };
  }

  public async resetCycle(): Promise<void> {
    await this.updateState({ sessionsToday: 0 });
    await this.start('focus');
  }

  private startInterval(): void {
    this.clearInterval();

    this.intervalId = setInterval(async () => {
      try {
        await this.processNextInterval();
      } catch (error) {
        console.error('Error in timer interval:', error);
        this.clearInterval();
        await this.stop();
      }
    }, TIMER_UPDATE_INTERVAL);
  }

  private async processNextInterval(): Promise<void> {
    if (!this.isRunning()) {
      this.clearInterval();
      return;
    }

    await this.handleRemainingTime();
  }

  private async handleRemainingTime(): Promise<void> {
    const remaining = calculateRemainingTime(this.currentTimer.endTime);
    if (remaining === null) {
      throw new TimerError('Invalid remaining time calculated');
    }

    if (remaining === 0) {
      await this.handleTimerComplete();
    } else {
      await this.updateState({ remainingTime: remaining });
    }
  }

  private async handleTimerComplete(): Promise<void> {
    const completedPhaseType = this.currentTimer.timerType;
    this.clearInterval();
    
    if (completedPhaseType) {
      await this.updateCompletionStats(completedPhaseType);
      await this.stop();
    }
  }

  private async updateCompletionStats(phaseType: TimerType): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const updates: Partial<TimerState> = {
      lastCompletedPhaseType: phaseType,
      lastSessionDate: today
    };
    
    if (phaseType === 'focus') {
      // Check if we need to reset daily sessions (new day)
      if (this.currentTimer.lastSessionDate !== today) {
        updates.sessionsToday = 1;
      } else {
        updates.sessionsToday = this.currentTimer.sessionsToday + 1;
      }
    }
    
    await this.updateState(updates);
  }

  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async handleError(operation: string, error: unknown): Promise<never> {
    console.error(`Error ${operation}:`, error);
    await this.stop();
    throw error;
  }
}

// Create and export singleton instance
const pomodoroTimer = new PomodoroTimer();
export default pomodoroTimer; 