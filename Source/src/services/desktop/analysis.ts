import { call } from './client';
export type AnalysisFrame = {
  mode: 'face' | 'person';
  width: number;
  height: number;
  pixels: number[];
};
export type AnalysisResult = { eye: number[]; width: number; height: number; mask?: string };
export const analyzeTransitionFrame = (frame: AnalysisFrame) =>
  call<AnalysisResult>('analyze_transition_frame', { frame });
