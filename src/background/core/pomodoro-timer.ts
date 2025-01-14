import { TimerState, TimerType, FOCUS_SESSIONS_BEFORE_LONG_BREAK, TIMER_UPDATE_INTERVAL } from './pomodoro-settings';
import { CompletionHandler } from '../managers/completion-handler';
import { BadgeManager } from '../managers/badge-manager';
import { TimerStateStorage } from '../managers/timer-state-storage';
import { ContextMenuManager } from '../managers/context-menu-manager';
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

  private async initialize(): Promise<void> {
    try {
      const storedState = await this.stateStorage.loadState();
      if (storedState) {
        await this.updateState({
          ...this.createDefaultState(),
          ...storedState
        });
        
        if (this.currentTimer.timerStatus === 'running') {
          this.startInterval();
        }
      } else {
        console.warn('No valid timer state in storage, using default');
        await this.updateState(this.createDefaultState());
      }
    } catch (error) {
      console.error('Error initializing timer:', error);
      await this.updateState(this.createDefaultState());
    }
  }

  private createDefaultState(): TimerState {
    return {
      timerStatus: 'stopped',
      timerType: null,
      lastCompletedPhaseType: null,
      endTime: null,
      remainingTime: null,
      focusSessionsCompleted: 0,
      totalCycles: 0
    };
  }

  private async updateState(timerStateUpdates: Partial<TimerState>): Promise<void> {
    try {
      const newTimerState = {
        ...this.currentTimer,
        ...timerStateUpdates,
      };

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
      this.currentTimer = this.createDefaultState();
      await this.updateState(this.createDefaultState());
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
      return (this.currentTimer.focusSessionsCompleted) >= FOCUS_SESSIONS_BEFORE_LONG_BREAK 
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
    await this.updateState({ focusSessionsCompleted: 0 });
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
    const updates: Partial<TimerState> = {
      lastCompletedPhaseType: phaseType
    };
    
    if (phaseType === 'focus') {
      updates.focusSessionsCompleted = this.currentTimer.focusSessionsCompleted + 1;
    } else if (phaseType === 'long-break') {
      updates.focusSessionsCompleted = 0;
      updates.totalCycles = this.currentTimer.totalCycles + 1;
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