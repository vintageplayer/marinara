// Manages offscreen document for audio playback in service worker

class OffscreenAudioManager {
  private offscreenDocumentPath = 'offscreen.html';
  
  private async ensureOffscreenDocument(): Promise<void> {
    // Check if offscreen document already exists
    const existingContexts = await (chrome.runtime as any).getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(this.offscreenDocumentPath)]
    });

    if (existingContexts.length > 0) {
      return; // Already exists
    }

    // Create offscreen document
    await (chrome as any).offscreen.createDocument({
      url: this.offscreenDocumentPath,
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Playing timer sounds and notification sounds'
    });
  }

  private async sendMessage(action: string, data?: any): Promise<any> {
    await this.ensureOffscreenDocument();
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action, data },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  public async startTimerSound(soundName: string): Promise<void> {
    return this.sendMessage('startTimerSound', { soundName });
  }

  public async stopTimerSound(): Promise<void> {
    return this.sendMessage('stopTimerSound');
  }

  public async startNoise(type: 'white' | 'pink' | 'brown', volume: number = 0.1): Promise<void> {
    return this.sendMessage('startNoise', { type, volume });
  }

  public async stopNoise(): Promise<void> {
    return this.sendMessage('stopNoise');
  }

  public async playNotificationSound(soundName: string): Promise<void> {
    return this.sendMessage('playNotificationSound', { soundName });
  }
}

export const offscreenAudioManager = new OffscreenAudioManager();