// Centralized sound file mappings to eliminate duplication

export const NOTIFICATION_SOUND_MAP: Record<string, string> = {
  // Original mappings
  'gong-1': 'gong',
  'gong-2': 'gong-2',
  'bell': 'bell',
  'chime': 'chime',
  'computer-magic': 'computer-magic',
  'robot-blip': 'robot-blip',
  // New notification sounds
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

export const TIMER_SOUND_MAP: Record<string, { tick: string; tock: string }> = {
  'stopwatch': { tick: 'stopwatch-tick', tock: 'stopwatch-tock' },
  'wristwatch': { tick: 'wristwatch-tick', tock: 'wristwatch-tock' },
  'clock': { tick: 'clock-tick', tock: 'clock-tock' },
  'wall-clock': { tick: 'wall-clock-tick', tock: 'wall-clock-tock' },
  'desk-clock': { tick: 'desk-clock-tick', tock: 'desk-clock-tock' },
  'wind-up-clock': { tick: 'wind-up-clock-tick', tock: 'wind-up-clock-tock' },
  'metronome': { tick: 'metronome-tick', tock: 'metronome-tock' },
  'wood-block': { tick: 'wood-block', tock: 'wood-block' }, // Single sound file
  'pulse': { tick: 'pulse', tock: 'pulse' }, // Single sound file
  'tick1': { tick: 'tick1', tock: 'tick2' }
};

// For preview purposes, we only need the tick sound
export const TIMER_PREVIEW_SOUND_MAP: Record<string, string> = {
  'stopwatch': 'stopwatch-tick',
  'wristwatch': 'wristwatch-tick',
  'clock': 'clock-tick',
  'wall-clock': 'wall-clock-tick',
  'desk-clock': 'desk-clock-tick',
  'wind-up-clock': 'wind-up-clock-tick',
  'metronome': 'metronome-tick',
  'wood-block': 'wood-block',
  'pulse': 'pulse',
  'tick1': 'tick1'
};

// Combined sound map for preview (includes both notification and timer sounds)
export const COMBINED_PREVIEW_SOUND_MAP: Record<string, string> = {
  ...NOTIFICATION_SOUND_MAP,
  ...TIMER_PREVIEW_SOUND_MAP
};