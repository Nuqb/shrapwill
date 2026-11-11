import audioPresets from './presets.json';
import type { AudioSettings } from '../../types';

export const audioDefaults: AudioSettings = {
  humReduction: -60,
  hissNoiseVolume: 5,
  channels: 'stereo',
  balance: 0,
  pitch: 0,
  equalizer: Array(10).fill(0),
  normalize: false,
  normalizeTarget: -16,
  duckFadeDuration: 0.33,
  duckFadePosition: 0,
  duckFadeSplit: 0.24242424242424243,
  ducking: false,
  duckAmount: 12,
  denoise: 0,
  reverbReduction: 0,
  windRemoval: false,
  hiss: 0,
  dehum: 0,
  deess: 0,
  voiceFilter: 'none',
  voiceCharacter: 'none',
};
export const eqFrequencies = [
  '31 Hz',
  '63 Hz',
  '125 Hz',
  '250 Hz',
  '500 Hz',
  '1 kHz',
  '2 kHz',
  '4 kHz',
  '8 kHz',
  '16 kHz',
];
export const eqPresets: Record<string, number[]> = {
  Flat: Array(10).fill(0),
  'Bass boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble boost': [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
  Voice: [-6, -4, -2, 0, 2, 3, 4, 2, 0, -2],
  Music: [3, 2, 0, -1, -2, 0, 2, 3, 3, 2],
};
export const voiceFilters = audioPresets.filters;
export const voiceCharacters = audioPresets.characters;

export function effectiveAudio(value: AudioSettings) {
  const a = { ...value };
  for (const key of ['denoise', 'hiss', 'reverbReduction', 'dehum', 'deess'] as const) {
    if (a.enabled?.[key] === false) a[key] = 0;
  }
  return a;
}
export function needsAudioProcessing(value = audioDefaults) {
  const a = effectiveAudio(value);
  return (
    a.channels !== 'stereo' ||
    a.balance !== 0 ||
    a.pitch !== 0 ||
    a.equalizer.some((db) => db !== 0) ||
    a.normalize ||
    a.denoise > 0 ||
    a.reverbReduction > 0 ||
    a.windRemoval ||
    a.hiss > 0 ||
    a.dehum > 0 ||
    a.deess > 0 ||
    a.voiceFilter !== 'none' ||
    a.voiceCharacter !== 'none'
  );
}
