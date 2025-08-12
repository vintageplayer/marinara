import React, { useState } from 'react';
import { TimerType } from '../background/core/pomodoro-settings';
import { settingsManager, SettingsField } from '../background/managers/settings-manager';
import { usePomodoroContext } from '../context/PomodoroContext';
import { audioPreview } from '../shared/audio-preview';

const PlayIcon = () => (
  <img 
    src="/images/play.svg" 
    alt="Play" 
    width="16" 
    height="16" 
    className="inline-block"
  />
);

const Settings: React.FC = () => {
  const [showSettingsSaved, setShowSettingsSaved] = useState(false);
  const { settings, updateSettings } = usePomodoroContext();

  const handleSettingChange = async (
    timerType: TimerType,
    field: SettingsField,
    value: any
  ) => {
    try {
      console.log('[Settings] handleSettingChange', timerType, field, value);
      await settingsManager.updateSetting(timerType, field, value);
      await updateSettings();
      setShowSettingsSaved(true);
      setTimeout(() => setShowSettingsSaved(false), 3000);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const handleSoundChange = async (
    timerType: TimerType,
    field: SettingsField,
    value: string | null
  ) => {
    // Update setting immediately (no waiting)
    await handleSettingChange(timerType, field, value);
    
    // Play sound preview in background (fire and forget)
    if (value && value !== '' && value !== null) {
      audioPreview.playSound(value).catch(error => {
        console.error('Error playing sound preview:', error);
      });
    }
  };


  const timerSounds = [
    { name: 'None', value: '' },
    { name: 'Stopwatch', value: 'stopwatch' },
    { name: 'Wristwatch', value: 'wristwatch' },
    { name: 'Clock', value: 'clock' },
    { name: 'Wall Clock', value: 'wall-clock' },
    { name: 'Desk Clock', value: 'desk-clock' },
    { name: 'Wind-up Clock', value: 'wind-up-clock' },
    { name: 'Metronome', value: 'metronome' },
    { name: 'Wood Block', value: 'wood-block' },
    { name: 'Pulse', value: 'pulse' },
    { name: 'Mechanical', value: 'tick1' },
    { name: 'White Noise', value: 'white-noise' },
    { name: 'Pink Noise', value: 'pink-noise' },
    { name: 'Brown Noise', value: 'brown-noise' }
  ];

  const notificationSounds = [
    { name: 'None', value: '' },
    { name: 'Tone', value: 'tone' },
    { name: 'Digital Watch', value: 'digital-watch' },
    { name: 'Analog Alarm Clock', value: 'analog-alarm-clock' },
    { name: 'Digital Alarm Clock', value: 'digital-alarm-clock' },
    { name: 'Electronic Chime', value: 'chime' },
    { name: 'Gong 1', value: 'gong' },
    { name: 'Gong 2', value: 'gong-2' },
    { name: 'Computer Magic', value: 'computer-magic' },
    { name: 'Fire Pager', value: 'fire-pager' },
    { name: 'Glass Ping', value: 'glass-ping' },
    { name: 'Music Box', value: 'music-box' },
    { name: 'Pin Drop', value: 'pin-drop' },
    { name: 'Robot Blip 1', value: 'robot-blip-1' },
    { name: 'Robot Blip 2', value: 'robot-blip' },
    { name: 'Ship Bell', value: 'bell' },
    { name: 'Train Horn', value: 'train-horn' },
    { name: 'Bike Horn', value: 'bike-horn' },
    { name: 'Ding', value: 'ding' }
  ];

  return (
    <form className="mt-2 max-w-2xl mx-auto">
      {/* Focus Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-normal text-red-700 mb-2 pb-1 border-b border-gray-400">Focus</h2>
        <div className="space-y-4">
          <div className="">
            <span className="text-base w-24">Duration: </span>
            <input
              type="number"
              min="1"
              max="999"
              className="w-16 pl-2 py-1 border border-gray-600 rounded text-base"
              value={settings.focus.duration}
              onChange={(e) => handleSettingChange('focus', 'duration', parseInt(e.target.value))}
              autoFocus
            />
            <span className="ml-2 text-base">minutes</span>
          </div>

          <div>
            <div className="text-base mb-2">Timer sound:</div>
            <div className="px-10">
              <select
                value={settings.focus.timerSound || ''}
                onChange={(e) => handleSoundChange('focus', 'timerSound', e.target.value || null)}
                className="border border-gray-600 rounded text-base bg-white"
              >
                <option value="">None</option>
                <optgroup label="Periodic Beat">
                  {timerSounds.slice(1, -3).map(sound => (
                    <option key={sound.value} value={sound.value}>{sound.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Ambient Noise">
                  {timerSounds.slice(-3).map(sound => (
                    <option key={sound.value} value={sound.value}>{sound.name}</option>
                  ))}
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
                  checked={settings.focus.notifications.desktop}
                  onChange={(e) => handleSettingChange('focus', 'notifications.desktop', e.target.checked)}
                  className="w-4 h-4 mr-2 accent-blue-500"
                />
                <span className="text-base">Show desktop notification</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.focus.notifications.tab}
                  onChange={(e) => handleSettingChange('focus', 'notifications.tab', e.target.checked)}
                  className="w-4 h-4 mr-2 accent-blue-500"
                />
                <span className="text-base">Show new tab notification</span>
              </label>

              <div className="flex items-center">
                <span className="text-base mr-2">Play sound:</span>
                <select
                  value={settings.focus.notifications.sound || ''}
                  onChange={(e) => handleSoundChange('focus', 'notifications.sound', e.target.value)}
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
            <span className="text-base mr-2 w-24">Duration: </span>
            <input
              type="number"
              min="1"
              max="999"
              className="w-16 pl-2 py-1 border border-gray-600 rounded text-base"
              value={settings['short-break'].duration}
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
                  checked={settings['short-break'].notifications.desktop}
                  onChange={(e) => handleSettingChange('short-break', 'notifications.desktop', e.target.checked)}
                  className="w-4 h-4 mr-2 accent-blue-500"
                />
                <span className="text-base">Show desktop notification</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings['short-break'].notifications.tab}
                  onChange={(e) => handleSettingChange('short-break', 'notifications.tab', e.target.checked)}
                  className="w-4 h-4 mr-2 accent-blue-500"
                />
                <span className="text-base">Show new tab notification</span>
              </label>

              <div className="flex items-center">
                <span className="text-base mr-2">Play sound:</span>
                <select
                  value={settings['short-break'].notifications.sound || ''}
                  onChange={(e) => handleSoundChange('short-break', 'notifications.sound', e.target.value)}
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
            <span className="text-base mr-2 w-36">Take a long break: </span>
            <select
              value={settings['long-break'].interval}
              onChange={(e) => handleSettingChange('long-break', 'interval', parseInt(e.target.value))}
              className="w-64 px-2 py-1 border border-gray-600 rounded text-base bg-white"
            >
              <option value={0}>Never</option>
              {[2,3,4,5,6,7,8,9,10].map(num => (
                <option key={num} value={num}>Every {num}th break</option>
              ))}
            </select>
          </div>

          <fieldset disabled={settings['long-break'].interval === 0} className="space-y-4">
            <div>
              <span className="text-base mr-2 w-24">Duration:</span>
              <input
                type="number"
                min="1"
                max="999"
                className="w-16 pl-2 py-1 border border-gray-600 rounded text-base"
                value={settings['long-break'].duration}
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
                    checked={settings['long-break'].notifications.desktop}
                    onChange={(e) => handleSettingChange('long-break', 'notifications.desktop', e.target.checked)}
                    className="w-4 h-4 mr-2 accent-blue-500"
                  />
                  <span className="text-base">Show desktop notification</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings['long-break'].notifications.tab}
                    onChange={(e) => handleSettingChange('long-break', 'notifications.tab', e.target.checked)}
                    className="w-4 h-4 mr-2 accent-blue-500"
                  />
                  <span className="text-base">Show new tab notification</span>
                </label>

                <div className="flex items-center">
                  <span className="text-base mr-2">Play sound:</span>
                  <select
                    value={settings['long-break'].notifications.sound || ''}
                    onChange={(e) => handleSoundChange('long-break', 'notifications.sound', e.target.value)}
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