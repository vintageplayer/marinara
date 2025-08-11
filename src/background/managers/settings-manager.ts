import { PomodoroSettings, DEFAULT_SETTINGS, TimerType, TimerSettings, LongBreakSettings } from '../core/pomodoro-settings';

export type SettingsField = keyof TimerSettings | 'notifications.desktop' | 'notifications.tab' | 'notifications.sound' | 'interval';

class SettingsManager {
  private settings: PomodoroSettings = DEFAULT_SETTINGS;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializationPromise = this.initialize();
    this.setupMessageListener();
  }

  private async initialize(): Promise<void> {
    await this.loadSettings();
    this.initialized = true;
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['settings']);
      if (result.settings) {
        console.log('[settings manager][loadSettings][result]', result);
        this.settings = this.getValidatedSettings(result.settings);
        console.log('[settings manager][loadSettings][validated]', this.settings);
      } else {
        console.log('[settings manager][loadSettings] No settings found, using defaults');
        await this.saveSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      await this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  public async waitForInitialization(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  private getValidatedSettings(settings: any): PomodoroSettings {
    const validatedSettings = { ...DEFAULT_SETTINGS };
    
    console.log('[settings manager][getValidatedSettings] Input settings:', settings);
    
    // Validate each timer type's settings
    for (const type of ['focus', 'short-break', 'long-break'] as TimerType[]) {
      if (settings[type]) {
        // Validate duration
        if (typeof settings[type].duration === 'number') {
          validatedSettings[type].duration = settings[type].duration;
          console.log('[settings manager][getValidatedSettings] Set duration for', type, 'to', settings[type].duration);
        }

        // Validate timer sound
        if (typeof settings[type].timerSound === 'string' || settings[type].timerSound === null) {
          validatedSettings[type].timerSound = settings[type].timerSound;
        }

        // Validate notifications
        if (settings[type].notifications) {
          if (typeof settings[type].notifications.desktop === 'boolean') {
            validatedSettings[type].notifications.desktop = settings[type].notifications.desktop;
          }
          if (typeof settings[type].notifications.tab === 'boolean') {
            validatedSettings[type].notifications.tab = settings[type].notifications.tab;
          }
          if (typeof settings[type].notifications.sound === 'string') {
            validatedSettings[type].notifications.sound = settings[type].notifications.sound;
          }
        }

        // Validate long break interval
        if (type === 'long-break' && typeof settings[type].interval === 'number') {
          (validatedSettings[type] as LongBreakSettings).interval = settings[type].interval;
        }
      }
    }

    console.log('[settings manager][getValidatedSettings] Final validated settings:', validatedSettings);
    return validatedSettings;
  }

  public async saveSettings(settings: PomodoroSettings): Promise<void> {
    try {
      const validatedSettings = this.getValidatedSettings(settings);
      await chrome.storage.local.set({ settings: validatedSettings });
      this.settings = validatedSettings;      
      console.log('[settings manager][saveSettings]', this.settings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  public async updateSetting(timerType: TimerType, timerField: SettingsField, updatedValue: any): Promise<void> {
    console.log('[settings manager][updateSetting]', timerType, timerField, updatedValue);
    try {
      const newSettings = { ...this.settings };

      // Handle nested fields (e.g., notifications.desktop)
      if (timerField.includes('.')) {
        const [category, field] = timerField.split('.') as ['notifications', 'desktop' | 'tab' | 'sound'];
        (newSettings[timerType][category] as any)[field] = updatedValue;
      } else {
        (newSettings[timerType] as any)[timerField] = updatedValue;
      }

      console.log('[settings manager][updateSetting][newSettings]', newSettings);
      
      // Save settings first
      await this.saveSettings(newSettings);
      
      // Then broadcast the change
      await chrome.runtime.sendMessage({ action: 'settingsChanged' });
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  public getSettings(): PomodoroSettings {
    console.log('[settings manager][getSettings]', this.settings);
    return { ...this.settings };
  }

  public getTimerDurationInMinutes(timerType: TimerType): number {
    console.log('[settings manager][getTimerDurationInMinutes]', timerType, this.settings[timerType].duration);
    return this.settings[timerType].duration;
  }

  public getTimerDurationInSeconds(timerType: TimerType): number {
    console.log('[settings manager][getTimerDurationInSeconds]', timerType, this.settings[timerType].duration);
    return this.settings[timerType].duration * 60;
  }

  public getLongBreakInterval(): number {
    return this.settings['long-break'].interval;
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(async (message) => {
      if (message.action === 'settingsChanged') {
        console.log('[SettingsManager] Received settingsChanged message, reloading settings');
        await this.loadSettings();
      }
    });
  }
}

// Create and export singleton instance
export const settingsManager = new SettingsManager(); 