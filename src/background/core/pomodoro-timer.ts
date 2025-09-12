import { 
  TimerType, 
  TIMER_UPDATE_INTERVAL,
  TimerState as TimerStateType  // Rename the imported interface
} from './pomodoro-settings';
import { CompletionHandler } from '../managers/completion-handler';
import { BadgeManager } from '../managers/badge-manager';
import { TimerStateStorage } from '../managers/timer-state-storage';
import { ContextMenuManager } from '../managers/context-menu-manager';
import { settingsManager } from '../managers/settings-manager';
import { getHistoricalStats } from './pomodoro-history';
import { timerAudioService } from '../services/timer-audio-service';
import { debugLogger } from '../services/debug-logger';
import { 
  calculateRemainingTime, 
  TimerError,
  validateTimerState 
} from './timer-utils';

export class PomodoroTimer {
  private currentTimer: TimerStateType;
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
    this.setupSettingsListener();
  }

  private createDefaultState(): TimerStateType {
    return {
      version: 1,
      timerStatus: 'stopped',
      timerType: null,
      lastCompletedPhaseType: null,
      endTime: null,
      remainingTime: null,
      initialDurationMinutes: null,
      sessionsSinceLastLongBreak: 0,
      lastSessionDate: ''
    };
  }

  private async initialize(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    try {
      const storedState = await this.stateStorage.loadState();
      
      if (storedState) {
        // Check if we need to reset daily sessions (new day)
        const shouldResetDaily = storedState.lastSessionDate !== today;
        
        if (shouldResetDaily) {
          await this.updateState({
            ...storedState,
            sessionsSinceLastLongBreak: 0,
            lastSessionDate: today
          });
        } else {
          await this.updateState(storedState);
        }
      } else {
        // No stored state, create a fresh one
        await this.updateState({
          ...this.createDefaultState(),
          lastSessionDate: today
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

  private async updateState(timerStateUpdates: Partial<TimerStateType>): Promise<void> {
    try {
      const newTimerState = {
        ...this.currentTimer,
        ...timerStateUpdates,
      };

      // Ensure version is never undefined or null
      if (typeof newTimerState.version !== 'number') {
        newTimerState.version = 1;
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
    await debugLogger.log('PomodoroTimer', 'toggleTimerState', 'called', {
      currentState: {
        timerStatus: this.currentTimer.timerStatus,
        timerType: this.currentTimer.timerType,
        remainingTime: this.currentTimer.remainingTime,
        endTime: this.currentTimer.endTime ? new Date(this.currentTimer.endTime).toISOString() : null,
        sessionsSinceLastLongBreak: this.currentTimer.sessionsSinceLastLongBreak
      }
    });
    
    // Wait for settings to be initialized
    await settingsManager.waitForInitialization();
    
    if (this.isRunning()) {
      await debugLogger.log('PomodoroTimer', 'toggleTimerState', 'pausing running timer');
      await this.pause();
    } else if (this.isPaused()) {
      await debugLogger.log('PomodoroTimer', 'toggleTimerState', 'resuming paused timer');
      await this.resume();
    } else {
      const nextType = this.getNextType();
      await debugLogger.log('PomodoroTimer', 'toggleTimerState', 'starting new timer', { nextType });
      await this.start(nextType);
    }

    await debugLogger.log('PomodoroTimer', 'toggleTimerState', 'completed', {
      finalState: {
        timerStatus: this.currentTimer.timerStatus,
        timerType: this.currentTimer.timerType,
        initialDurationMinutes: this.currentTimer.initialDurationMinutes,
        remainingTime: this.currentTimer.remainingTime,
        sessionsSinceLastLongBreak: this.currentTimer.sessionsSinceLastLongBreak
      }
    });
  }

  public getNextType(): TimerType {
    const lastPhase = this.currentTimer.lastCompletedPhaseType;
    
    // Always return to focus after any break (matches Marinara's pattern)
    if (lastPhase === 'short-break' || lastPhase === 'long-break') {
      return 'focus';
    }
    
    // If no previous phase or starting fresh, start with focus
    if (!lastPhase) {
      return 'focus';
    }
    
    // After focus, determine break type based on sessions
    const longBreakInterval = settingsManager.getLongBreakInterval();
    console.log('[PomodoroTimer][getNextType] sessionsSinceLastLongBreak:', this.currentTimer.sessionsSinceLastLongBreak, 'interval:', longBreakInterval);
    
    // Use >= instead of modulo check for clearer logic
    if (longBreakInterval > 0 && this.currentTimer.sessionsSinceLastLongBreak >= longBreakInterval) {
      return 'long-break';
    }
    
    return 'short-break';
  }

  public async start(timerType: TimerType): Promise<void> {
    // Wait for settings to be initialized
    await settingsManager.waitForInitialization();

    const durationMinutes = settingsManager.getTimerDurationInMinutes(timerType);
    const durationSeconds = durationMinutes * 60;
    const now = Date.now();
    const endTime = now + durationSeconds * 1000;

    await debugLogger.log('PomodoroTimer', 'start', 'STARTING TIMER', {
      type: timerType,
      durationMinutes,
      durationSeconds,
      now: new Date(now).toISOString(),
      endTime: new Date(endTime).toISOString(),
      calculatedDurationMs: durationSeconds * 1000
    });

    await this.updateState({
      timerStatus: 'running',
      timerType,
      endTime,
      remainingTime: durationSeconds,
      initialDurationMinutes: durationMinutes
    });

    // Start timer sound if configured
    const currentSettings = settingsManager.getSettings();
    const timerSettings = currentSettings[timerType];
    if (timerSettings.timerSound) {
      timerAudioService.startTimerSound(timerSettings.timerSound);
    }

    this.startInterval();
  }

  public async stop(): Promise<void> {
    try {
      // Stop any timer sounds
      timerAudioService.stopTimerSound();
      
      await this.updateState({
        timerStatus: 'stopped',
        timerType: null,
        endTime: null,
        remainingTime: null,
        initialDurationMinutes: null
      });
    } catch (error) {
      await this.handleError('stopping timer', error);
    }
  }

  public async pause(): Promise<void> {
    try {
      if (!this.isRunning()) return;
      
      // Stop timer sounds when pausing
      timerAudioService.stopTimerSound();
      
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
      
      // Restart timer sound if configured
      const currentSettings = settingsManager.getSettings();
      const timerSettings = currentSettings[this.currentTimer.timerType];
      if (timerSettings.timerSound) {
        timerAudioService.startTimerSound(timerSettings.timerSound);
      }
      
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

  public getCurrentState(): TimerStateType {
    return { ...this.currentTimer };
  }

  public async resetCycle(): Promise<void> {
    await this.updateState({ 
      sessionsSinceLastLongBreak: 0,
      lastCompletedPhaseType: null 
    });
    await this.start('focus');
  }

  private startInterval(): void {
    this.clearInterval();

    debugLogger.log('PomodoroTimer', 'startInterval', 'STARTING TIMER INTERVAL', {
      intervalMs: TIMER_UPDATE_INTERVAL,
      currentEndTime: this.currentTimer.endTime ? new Date(this.currentTimer.endTime).toISOString() : null
    });

    this.intervalId = setInterval(async () => {
      try {
        await this.processNextInterval();
      } catch (error) {
        console.error('Error in timer interval:', error);
        await debugLogger.log('PomodoroTimer', 'startInterval', 'ERROR IN INTERVAL - STOPPING TIMER', { error: String(error) });
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

    await debugLogger.log('PomodoroTimer', 'handleRemainingTime', 'interval tick', {
      remaining,
      endTime: this.currentTimer.endTime ? new Date(this.currentTimer.endTime).toISOString() : null,
      currentTime: new Date().toISOString(),
      timerType: this.currentTimer.timerType
    });

    if (remaining === 0) {
      await debugLogger.log('PomodoroTimer', 'handleRemainingTime', 'TIMER REACHED ZERO - COMPLETING', {
        timerType: this.currentTimer.timerType,
        initialDuration: this.currentTimer.initialDurationMinutes
      });
      await this.handleTimerComplete();
    } else {
      await this.updateState({ remainingTime: remaining });
    }
  }

  private async handleTimerComplete(): Promise<void> {
    const completedPhaseType = this.currentTimer.timerType;
    this.clearInterval();
    
    await debugLogger.log('PomodoroTimer', 'handleTimerComplete', 'called', {
      completedPhaseType,
      initialDurationMinutes: this.currentTimer.initialDurationMinutes,
      currentState: {
        timerStatus: this.currentTimer.timerStatus,
        sessionsSinceLastLongBreak: this.currentTimer.sessionsSinceLastLongBreak
      }
    });
    
    if (completedPhaseType) {
      await debugLogger.log('PomodoroTimer', 'handleTimerComplete', 'timer naturally completed', {
        type: completedPhaseType,
        initialDurationMinutes: this.currentTimer.initialDurationMinutes
      });
      
      await this.updateCompletionStats(completedPhaseType);
      await this.stop();
    }
  }

  private async updateCompletionStats(phaseType: TimerType): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const updates: Partial<TimerStateType> = {
      lastCompletedPhaseType: phaseType,
      lastSessionDate: today
    };
    
    if (phaseType === 'focus') {
      // Increment sessions since last long break
      updates.sessionsSinceLastLongBreak = this.currentTimer.sessionsSinceLastLongBreak + 1;
    } else if (phaseType === 'long-break') {
      // Reset the counter after a long break
      updates.sessionsSinceLastLongBreak = 0;
    }
    
    await this.updateState(updates);
  }

  private clearInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private setupSettingsListener(): void {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'settingsChanged') {
        console.log('[PomodoroTimer] Settings changed, will use new settings for next timer');
      }
    });
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