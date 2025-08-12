// Noise service for generating procedural white, pink, and brown noise
// Based on Marinara's src/Noise.js implementation
export class NoiseService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private noiseType: 'white' | 'pink' | 'brown' = 'white';

  private initializeAudioContext(): AudioContext {
    if (!this.audioContext) {
      // Use AudioContext or webkitAudioContext for Safari compatibility
      const AudioContextClass = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
    }
    return this.audioContext!;
  }

  private generateWhiteNoise(sampleRate: number, duration: number): Float32Array {
    const frameCount = sampleRate * duration;
    const buffer = new Float32Array(frameCount);
    
    for (let i = 0; i < frameCount; i++) {
      buffer[i] = Math.random() * 2 - 1; // Random between -1 and 1
    }
    
    return buffer;
  }

  private generatePinkNoise(sampleRate: number, duration: number): Float32Array {
    const frameCount = sampleRate * duration;
    const buffer = new Float32Array(frameCount);
    
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      
      buffer[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    
    return buffer;
  }

  private generateBrownNoise(sampleRate: number, duration: number): Float32Array {
    const frameCount = sampleRate * duration;
    const buffer = new Float32Array(frameCount);
    
    let lastOut = 0;
    
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      buffer[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = buffer[i];
      buffer[i] *= 3.5; // Amplify brown noise
    }
    
    return buffer;
  }

  private createNoiseBuffer(type: 'white' | 'pink' | 'brown', duration: number = 2): AudioBuffer {
    const context = this.initializeAudioContext();
    const sampleRate = context.sampleRate;
    const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
    
    let noiseData: Float32Array;
    
    switch (type) {
      case 'white':
        noiseData = this.generateWhiteNoise(sampleRate, duration);
        break;
      case 'pink':
        noiseData = this.generatePinkNoise(sampleRate, duration);
        break;
      case 'brown':
        noiseData = this.generateBrownNoise(sampleRate, duration);
        break;
      default:
        noiseData = this.generateWhiteNoise(sampleRate, duration);
    }
    
    buffer.getChannelData(0).set(noiseData);
    return buffer;
  }

  public async startNoise(type: 'white' | 'pink' | 'brown', volume: number = 0.1): Promise<void> {
    try {
      this.stopNoise();
      
      const context = this.initializeAudioContext();
      
      // Resume context if suspended (required by many browsers)
      if (context.state === 'suspended') {
        await context.resume();
      }
      
      // Create noise buffer (2 seconds, will loop)
      const noiseBuffer = this.createNoiseBuffer(type, 2);
      
      // Create source and gain nodes
      this.noiseSource = context.createBufferSource();
      this.gainNode = context.createGain();
      
      // Configure source
      this.noiseSource.buffer = noiseBuffer;
      this.noiseSource.loop = true;
      
      // Configure gain (volume)
      this.gainNode.gain.setValueAtTime(volume, context.currentTime);
      
      // Connect nodes: source -> gain -> destination
      this.noiseSource.connect(this.gainNode);
      this.gainNode.connect(context.destination);
      
      // Start playing
      this.noiseSource.start(0);
      this.isPlaying = true;
      this.noiseType = type;
      
    } catch (error) {
      console.error(`Error starting ${type} noise:`, error);
      throw error;
    }
  }

  public stopNoise(): void {
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
      } catch (error) {
        // Ignore errors when stopping already stopped sources
      }
      this.noiseSource = null;
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    
    this.isPlaying = false;
  }

  public setVolume(volume: number): void {
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }

  public isNoiseType(type: string): boolean {
    return type === 'white-noise' || type === 'pink-noise' || type === 'brown-noise';
  }

  public getNoiseTypeFromSoundName(soundName: string): 'white' | 'pink' | 'brown' | null {
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

  public dispose(): void {
    this.stopNoise();
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }
  }
}

// Create and export singleton instance
export const noiseService = new NoiseService();