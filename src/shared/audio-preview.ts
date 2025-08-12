// Shared audio preview utility for UI components
import { NoiseService } from '../background/services/noise-service';
import { COMBINED_PREVIEW_SOUND_MAP } from './sound-mappings';

export class AudioPreview {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private noiseService: NoiseService = new NoiseService();
  private isServiceWorkerEnvironment: boolean;

  constructor() {
    // Detect if we're in a service worker environment (no window/document)
    this.isServiceWorkerEnvironment = typeof window === 'undefined' && typeof document === 'undefined';
  }
  
  private async playWithAudioContext(soundName: string): Promise<void> {
    const actualSoundName = COMBINED_PREVIEW_SOUND_MAP[soundName] || soundName;
    const url = chrome.runtime.getURL(`audio/${actualSoundName}.mp3`);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    if (!this.audioContext) {
      const AudioContextClass = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      this.audioContext!.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),
        (error) => reject(error)
      );
    });
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    const source = this.audioContext!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext!.destination);
    source.start();
  }

  private async playWithAudioElement(soundName: string): Promise<void> {
    const actualSoundName = COMBINED_PREVIEW_SOUND_MAP[soundName] || soundName;
    const audioUrl = chrome.runtime.getURL(`audio/${actualSoundName}.mp3`);
    this.audio = new Audio(audioUrl);
    
    this.audio.play().catch(error => {
      console.warn(`Preview sound not available: ${soundName} (${actualSoundName}.mp3)`);
    });
  }

  public async playSound(soundName: string): Promise<void> {
    if (!soundName || soundName === '') {
      return; // No sound to play
    }
    
    try {
      // Stop any currently playing audio
      this.stopSound();
      
      // Check if this is a noise sound
      const noiseType = this.noiseService.getNoiseTypeFromSoundName(soundName);
      if (noiseType) {
        // Play noise for 2 seconds as preview
        await this.noiseService.startNoise(noiseType, 0.1);
        setTimeout(() => {
          this.noiseService.stopNoise();
        }, 2000);
        return;
      }
      
      // Use AudioElement in UI environments (where HTMLAudioElement is available)
      // Use AudioContext in service worker environments (where HTMLAudioElement is not available)
      if (this.isServiceWorkerEnvironment) {
        await this.playWithAudioContext(soundName);
      } else {
        await this.playWithAudioElement(soundName);
      }
      
    } catch (error) {
      console.error(`Error playing preview sound ${soundName}:`, error);
      // Don't throw error for UI preview - just log and continue
    }
  }
  
  public stopSound(): void {
    // Stop any playing noise
    this.noiseService.stopNoise();
    
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }
}

export const audioPreview = new AudioPreview();