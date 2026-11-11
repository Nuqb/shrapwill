import { call } from './client';
import type { AudioSettings } from '../../types';

export const prepareAudio = (id: string, settings: AudioSettings) =>
  call<string>('prepare_audio', { id, settings });
