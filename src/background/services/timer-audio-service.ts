import { offscreenAudioManager } from './offscreen-audio-manager';

export class TimerAudioService {
  private isPlaying: boolean = false;
  

  public async startTimerSound(soundName: string): Promise<void> {
    if (!soundName || soundName === '') {
      return; // No timer sound selected
    }
    
    try {
      await offscreenAudioManager.startTimerSound(soundName);
      this.isPlaying = true;
    } catch (error) {
      console.error(`Error starting timer sound ${soundName}:`, error);
    }
  }
  
  
  public stopTimerSound(): void {
    if (this.isPlaying) {
      offscreenAudioManager.stopTimerSound().catch(console.error);
      this.isPlaying = false;
    }
  }
}

// Create and export singleton instance
export const timerAudioService = new TimerAudioService();