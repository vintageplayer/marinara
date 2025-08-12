// Offscreen document for audio playback in Manifest V3
// This runs in a DOM context where AudioContext is available

interface AudioMessage {
  action: string;
  data?: any;
}

interface TimerAudioState {
  context: AudioContext | null;
  tickBuffer: AudioBuffer | null;
  tockBuffer: AudioBuffer | null;
  interval: NodeJS.Timeout | null;
  isTickTurn: boolean;
}

interface NoiseState {
  context: AudioContext | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
}

class OffscreenAudioManager {
  private timerAudio: TimerAudioState = {
    context: null,
    tickBuffer: null,
    tockBuffer: null,
    interval: null,
    isTickTurn: true
  };

  private noiseState: NoiseState = {
    context: null,
    source: null,
    gainNode: null,
    isPlaying: false
  };

  constructor() {
    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener((message: AudioMessage, sender, sendResponse) => {
      this.handleMessage(message).then(sendResponse).catch(console.error);
      return true; // Keep the message channel open for async response
    });
  }

  private async handleMessage(message: AudioMessage): Promise<any> {
    switch (message.action) {
      case 'startTimerSound':
        return this.startTimerSound(message.data.soundName);
      case 'stopTimerSound':
        return this.stopTimerSound();
      case 'startNoise':
        return this.startNoise(message.data.type, message.data.volume);
      case 'stopNoise':
        return this.stopNoise();
      case 'playNotificationSound':
        return this.playNotificationSound(message.data.soundName);
      default:
        console.warn('Unknown audio action:', message.action);
    }
  }

  private async loadAudioBuffer(filename: string): Promise<AudioBuffer> {
    const url = chrome.runtime.getURL(`audio/${filename}.mp3`);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    const context = new AudioContext();
    return new Promise((resolve, reject) => {
      context.decodeAudioData(
        arrayBuffer,
        (buffer) => resolve(buffer),
        (error) => reject(error)
      );
    });
  }

  private async startTimerSound(soundName: string): Promise<void> {
    // Stop any existing timer sound
    await this.stopTimerSound();

    // Check if it's a noise sound
    const noiseType = this.getNoiseTypeFromSoundName(soundName);
    if (noiseType) {
      return this.startNoise(noiseType, 0.1);
    }

    // Handle tick-tock sounds
    const soundMap: Record<string, { tick: string; tock: string }> = {
      'stopwatch': { tick: 'stopwatch-tick', tock: 'stopwatch-tock' },
      'wristwatch': { tick: 'wristwatch-tick', tock: 'wristwatch-tock' },
      'clock': { tick: 'clock-tick', tock: 'clock-tock' },
      'wall-clock': { tick: 'wall-clock-tick', tock: 'wall-clock-tock' },
      'desk-clock': { tick: 'desk-clock-tick', tock: 'desk-clock-tock' },
      'wind-up-clock': { tick: 'wind-up-clock-tick', tock: 'wind-up-clock-tock' },
      'metronome': { tick: 'metronome-tick', tock: 'metronome-tock' },
      'wood-block': { tick: 'wood-block', tock: 'wood-block' },
      'pulse': { tick: 'pulse', tock: 'pulse' },
      'tick1': { tick: 'tick1', tock: 'tick2' }
    };

    const soundFiles = soundMap[soundName];
    if (!soundFiles) {
      console.warn(`Timer sound not found: ${soundName}`);
      return;
    }

    // Load audio buffers
    this.timerAudio.context = new AudioContext();
    this.timerAudio.tickBuffer = await this.loadAudioBuffer(soundFiles.tick);
    this.timerAudio.tockBuffer = await this.loadAudioBuffer(soundFiles.tock);
    
    // Start tick-tock interval
    this.timerAudio.interval = setInterval(() => {
      this.playNextTickTock();
    }, 1000);

    // Play first tick immediately
    this.playNextTickTock();
  }

  private playNextTickTock(): void {
    if (!this.timerAudio.context) return;

    const buffer = this.timerAudio.isTickTurn 
      ? this.timerAudio.tickBuffer 
      : this.timerAudio.tockBuffer;

    if (buffer) {
      const source = this.timerAudio.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.timerAudio.context.destination);
      source.start();
    }

    this.timerAudio.isTickTurn = !this.timerAudio.isTickTurn;
  }

  private async stopTimerSound(): Promise<void> {
    // Stop tick-tock interval
    if (this.timerAudio.interval) {
      clearInterval(this.timerAudio.interval);
      this.timerAudio.interval = null;
    }

    // Close audio context
    if (this.timerAudio.context) {
      await this.timerAudio.context.close();
      this.timerAudio.context = null;
    }

    // Reset state
    this.timerAudio.tickBuffer = null;
    this.timerAudio.tockBuffer = null;
    this.timerAudio.isTickTurn = true;

    // Also stop any noise
    await this.stopNoise();
  }

  private generateNoiseBuffer(type: 'white' | 'pink' | 'brown', context: AudioContext, duration: number = 2): AudioBuffer {
    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);
    
    switch (type) {
      case 'white':
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        break;
        
      case 'pink':
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < data.length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
        break;
        
      case 'brown':
        let lastOut = 0;
        for (let i = 0; i < data.length; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
        break;
    }
    
    return buffer;
  }

  private async startNoise(type: 'white' | 'pink' | 'brown', volume: number): Promise<void> {
    await this.stopNoise();

    this.noiseState.context = new AudioContext();
    
    // Resume context if suspended
    if (this.noiseState.context.state === 'suspended') {
      await this.noiseState.context.resume();
    }

    // Generate noise buffer
    const noiseBuffer = this.generateNoiseBuffer(type, this.noiseState.context, 2);
    
    // Create source and gain nodes
    this.noiseState.source = this.noiseState.context.createBufferSource();
    this.noiseState.gainNode = this.noiseState.context.createGain();
    
    // Configure nodes
    this.noiseState.source.buffer = noiseBuffer;
    this.noiseState.source.loop = true;
    this.noiseState.gainNode.gain.setValueAtTime(volume, this.noiseState.context.currentTime);
    
    // Connect and start
    this.noiseState.source.connect(this.noiseState.gainNode);
    this.noiseState.gainNode.connect(this.noiseState.context.destination);
    this.noiseState.source.start(0);
    
    this.noiseState.isPlaying = true;
  }

  private async stopNoise(): Promise<void> {
    if (this.noiseState.source) {
      try {
        this.noiseState.source.stop();
        this.noiseState.source.disconnect();
      } catch (error) {
        // Ignore errors when stopping already stopped sources
      }
      this.noiseState.source = null;
    }
    
    if (this.noiseState.gainNode) {
      this.noiseState.gainNode.disconnect();
      this.noiseState.gainNode = null;
    }
    
    if (this.noiseState.context) {
      await this.noiseState.context.close();
      this.noiseState.context = null;
    }
    
    this.noiseState.isPlaying = false;
  }

  private async playNotificationSound(soundName: string): Promise<void> {
    const soundMap: Record<string, string> = {
      'gong-1': 'gong',
      'gong-2': 'gong-2',
      'bell': 'bell',
      'chime': 'chime',
      'computer-magic': 'computer-magic',
      'robot-blip': 'robot-blip',
      'tone': 'tone',
      'digital-watch': 'digital-watch',
      'analog-alarm-clock': 'analog-alarm-clock',
      'digital-alarm-clock': 'digital-alarm-clock',
      'fire-pager': 'fire-pager',
      'glass-ping': 'glass-ping',
      'music-box': 'music-box',
      'pin-drop': 'pin-drop',
      'robot-blip-1': 'robot-blip-1',
      'train-horn': 'train-horn',
      'bike-horn': 'bike-horn',
      'ding': 'ding'
    };

    const actualSoundName = soundMap[soundName] || soundName;
    const buffer = await this.loadAudioBuffer(actualSoundName);
    
    const context = new AudioContext();
    if (context.state === 'suspended') {
      await context.resume();
    }
    
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
    
    // Clean up when done
    source.onended = () => {
      context.close();
    };
  }

  private getNoiseTypeFromSoundName(soundName: string): 'white' | 'pink' | 'brown' | null {
    switch (soundName) {
      case 'white-noise':
        return 'white';
      case 'pink-noise':
        return 'pink';
      case 'brown-noise':
        return 'brown';
      default:
        return null;
    }
  }
}

// Initialize the audio manager
new OffscreenAudioManager();