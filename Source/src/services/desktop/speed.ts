import { call } from './client';
export type SpeedOptions = {
  rate: number;
  reverse: boolean;
  maintainPitch: boolean;
  points: number[][];
};
export const retimeClip = (id: string, options: SpeedOptions, ripple: boolean) =>
  call<void>('retime_clip', { id, options, ripple });
