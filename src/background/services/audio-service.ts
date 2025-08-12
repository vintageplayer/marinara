import { offscreenAudioManager } from './offscreen-audio-manager';
import { NOTIFICATION_SOUND_MAP } from '../../shared/sound-mappings';

export class AudioService {
  public async playSound(soundName: string): Promise<void> {
    try {
      await offscreenAudioManager.playNotificationSound(soundName);
    } catch (error) {
      console.error(`Error playing sound ${soundName}:`, error);
      throw error;
    }
  }
  
  public stopSound(): void {
    // For one-shot notification sounds, we typically don't need to stop them
    // They will stop naturally when finished
  }
  
  public async playNotificationSound(soundName: string): Promise<void> {
    const actualSoundName = NOTIFICATION_SOUND_MAP[soundName] || soundName;
    return this.playSound(actualSoundName);
  }
}

// Create and export singleton instance
export const audioService = new AudioService();