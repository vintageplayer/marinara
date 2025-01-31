import React, { useState, useEffect } from 'react';
import { TimerType } from '../background/core/pomodoro-settings';

interface SettingsProps {
  onSettingsChange?: (settings: any) => void;
}

interface TimerSettings {
  duration: number;
  timerSound: string | null;
  timerBpm?: number | null;
  notifications: {
    desktop: boolean;
    tab: boolean;
    sound: string;
  };
}

interface LongBreakSettings extends TimerSettings {
  interval: number;
}

const PlayIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className="inline-block"
  >
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const Settings: React.FC<SettingsProps> = ({ onSettingsChange }) => {
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);
  const [canPlayTimerSound, setCanPlayTimerSound] = useState(false);
  const [isPlayingTimerSound, setIsPlayingTimerSound] = useState(false);

  const [focusSettings, setFocusSettings] = useState<TimerSettings>({
    duration: 25,
    timerSound: null,
    timerBpm: null,
    notifications: {
      desktop: true,
      tab: true,
      sound: 'Gong 1'
    }
  });

  const [shortBreakSettings, setShortBreakSettings] = useState<TimerSettings>({
    duration: 5,
    timerSound: null,
    notifications: {
      desktop: true,
      tab: true,
      sound: 'Gong 2'
    }
  });

  const [longBreakSettings, setLongBreakSettings] = useState<LongBreakSettings>({
    duration: 15,
    interval: 4,
    timerSound: null,
    notifications: {
      desktop: true,
      tab: true,
      sound: 'Gong 2'
    }
  });

  const timerSounds = [
    { name: 'Ticking', files: 'ticking' },
    { name: 'Mechanical', files: 'mechanical' }
  ];

  const notificationSounds = [
    { name: 'None', value: null },
    { name: 'Gong 1', value: 'gong-1' },
    { name: 'Gong 2', value: 'gong-2' },
    { name: 'Bell', value: 'bell' }
  ];

  useEffect(() => {
    // Load settings from chrome.storage.local
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        const { focus, shortBreak, longBreak } = result.settings;
        if (focus) setFocusSettings(focus);
        if (shortBreak) setShortBreakSettings(shortBreak);
        if (longBreak) setLongBreakSettings(longBreak);
      }
    });
  }, []);

  const handleSettingChange = (
    timerType: TimerType,
    field: string,
    value: any
  ) => {
    const setSettings = {
      'focus': setFocusSettings,
      'short-break': setShortBreakSettings,
      'long-break': setLongBreakSettings
    }[timerType];

    setSettings((prev: any) => {
      const newSettings = { ...prev };
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        newSettings[parent] = { ...newSettings[parent], [child]: value };
      } else {
        newSettings[field] = value;
      }
      
      // Save to chrome.storage.local
      chrome.storage.local.get(['settings'], (result) => {
        const currentSettings = result.settings || {};
        chrome.storage.local.set({
          settings: {
            ...currentSettings,
            [timerType]: newSettings
          }
        }, () => {
          setShowSettingsSaved(true);
          setTimeout(() => setShowSettingsSaved(false), 3000);
        });
      });

      return newSettings;
    });
  };

  const playTimerSound = () => {
    if (!canPlayTimerSound) return;
    setIsPlayingTimerSound(true);
    // Add sound playing logic here
  };

  const stopTimerSound = () => {
    setIsPlayingTimerSound(false);
    // Add sound stopping logic here
  };

  return (
    <form className="mt-2 max-w-2xl mx-auto">
      {/* Focus Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-red-700 mb-2 pb-1 border-b border-gray-400">Focus</h2>
        <div className="space-y-4">
          <div className="">
            <span className="text-base w-24">Duration:</span>
            <input
              type="number"
              min="1"
              max="999"
              className="w-16 pl-2 py-1 border border-gray-600 rounded text-base"
              value={focusSettings.duration}
              onChange={(e) => handleSettingChange('focus', 'duration', parseInt(e.target.value))}
              autoFocus
            />
            <span className="ml-2 text-base">minutes</span>
          </div>

          <div>
            <div className="text-base mb-2">Timer sound:</div>
            <div className="px-10">
              <select
                value={focusSettings.timerSound || ''}
                onChange={(e) => handleSettingChange('focus', 'timerSound', e.target.value || null)}
              className="border border-gray-600 rounded text-base bg-white"
            >
              <option value="">None</option>
              <optgroup label="Periodic Beat">
                {timerSounds.map(sound => (
                  <option key={sound.files} value={sound.files}>{sound.name}</option>
                ))}
              </optgroup>
              <optgroup label="Noise">
                <option value="brown-noise">Brown Noise</option>
                <option value="pink-noise">Pink Noise</option>
                <option value="white-noise">White Noise</option>
              </optgroup>
            </select>
            </div>
          </div>

          <div>
            <div className="text-base mb-2">When complete:</div>
            <div className="space-y-2 px-10">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={focusSettings.notifications.desktop}
                  onChange={(e) => handleSettingChange('focus', 'notifications.desktop', e.target.checked)}
                  className="w-4 h-4 mr-2 accent-blue-500"
                />
                <span className="text-base">Show desktop notification</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={focusSettings.notifications.tab}
                  onChange={(e) => handleSettingChange('focus', 'notifications.tab', e.target.checked)}
                  className="w-4 h-4 mr-2 accent-blue-500"
                />
                <span className="text-base">Show new tab notification</span>
              </label>

              <div className="flex items-center">
                <span className="text-base mr-2">Play sound:</span>
                <select
                  value={focusSettings.notifications.sound}
                  onChange={(e) => handleSettingChange('focus', 'notifications.sound', e.target.value)}
                  className="min-w-32 border border-gray-600 rounded text-base bg-white"
                >
                  {notificationSounds.map(sound => (
                    <option key={sound.value || 'none'} value={sound.value || ''}>
                      {sound.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Short Break Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-red-700 mb-2 pb-1 border-b border-gray-400">Short Break</h2>
        <div className="space-y-4">
          <div className="">
            <span className="text-base mr-2 w-24">Duration:</span>&nbsp;
            <input
              type="number"
              min="1"
              max="999"
              className="w-16 pl-2 py-1 border border-gray-600 rounded text-base"
              value={shortBreakSettings.duration}
              onChange={(e) => handleSettingChange('short-break', 'duration', parseInt(e.target.value))}
            />
            <span className="ml-2 text-base">minutes</span>
          </div>

          <div>
            <div className="text-base mb-2">When complete:</div>
            <div className="space-y-2 px-10">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={shortBreakSettings.notifications.desktop}
                  onChange={(e) => handleSettingChange('short-break', 'notifications.desktop', e.target.checked)}
                  className="w-4 h-4 mr-2 accent-blue-500"
                />
                <span className="text-base">Show desktop notification</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={shortBreakSettings.notifications.tab}
                  onChange={(e) => handleSettingChange('short-break', 'notifications.tab', e.target.checked)}
                  className="w-4 h-4 mr-2 accent-blue-500"
                />
                <span className="text-base">Show new tab notification</span>
              </label>

              <div className="flex items-center">
                <span className="text-base mr-2">Play sound:</span>
                <select
                  value={shortBreakSettings.notifications.sound}
                  onChange={(e) => handleSettingChange('short-break', 'notifications.sound', e.target.value)}
                  className="min-w-32 border border-gray-600 rounded text-base bg-white"
                >
                  {notificationSounds.map(sound => (
                    <option key={sound.value || 'none'} value={sound.value || ''}>
                      {sound.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Long Break Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-red-700 mb-2 pb-1 border-b border-gray-400">Long Break</h2>
        <div className="space-y-4">
          <div>
            <span className="text-base mr-2 w-36">Take a long break:</span>&nbsp;
            <select
              value={longBreakSettings.interval}
              onChange={(e) => handleSettingChange('long-break', 'interval', parseInt(e.target.value))}
              className="w-64 px-2 py-1 border border-gray-600 rounded text-base bg-white"
            >
              <option value={0}>Never</option>
              {[2,3,4,5,6,7,8,9,10].map(num => (
                <option key={num} value={num}>Every {num}th break</option>
              ))}
            </select>
          </div>

          <fieldset disabled={longBreakSettings.interval === 0} className="space-y-4">
            <div>
              <span className="text-base mr-2 w-24">Duration:</span>
              <input
                type="number"
                min="1"
                max="999"
                className="w-16 pl-2 py-1 border border-gray-600 rounded text-base"
                value={longBreakSettings.duration}
                onChange={(e) => handleSettingChange('long-break', 'duration', parseInt(e.target.value))}
              />
              <span className="ml-2 text-base">minutes</span>
            </div>

            <div>
              <div className="text-base mb-2">When complete:</div>
              <div className="space-y-2 px-10">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={longBreakSettings.notifications.desktop}
                    onChange={(e) => handleSettingChange('long-break', 'notifications.desktop', e.target.checked)}
                    className="w-4 h-4 mr-2 accent-blue-500"
                  />
                  <span className="text-base">Show desktop notification</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={longBreakSettings.notifications.tab}
                    onChange={(e) => handleSettingChange('long-break', 'notifications.tab', e.target.checked)}
                    className="w-4 h-4 mr-2 accent-blue-500"
                  />
                  <span className="text-base">Show new tab notification</span>
                </label>

                <div className="flex items-center">
                  <span className="text-base mr-2">Play sound:</span>
                  <select
                    value={longBreakSettings.notifications.sound}
                    onChange={(e) => handleSettingChange('long-break', 'notifications.sound', e.target.value)}
                    className="min-w-32 border border-gray-600 rounded text-base bg-white"
                  >
                    {notificationSounds.map(sound => (
                      <option key={sound.value || 'none'} value={sound.value || ''}>
                        {sound.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Settings Saved Notification */}
      {showSettingsSaved && (
        <div 
          className="fixed bottom-0 right-0 m-10 p-2 px-5 flex items-center bg-white border border-green-800 text-green-800 rounded-full cursor-pointer text-lg"
          onClick={() => setShowSettingsSaved(false)}
        >
          <img src="/images/check.svg" className="w-8 h-8 mr-2" alt="" />
          Settings saved
        </div>
      )}
    </form>
  );
};

export default Settings; 