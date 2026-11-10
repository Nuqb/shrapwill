export const hoverRate = 30;
export const hoverHold = 0.5;
export function hoverFrame(elapsed: number, duration: number, active: boolean) {
  const frames = Math.max(1, Math.round(duration * hoverRate));
  if (!active) return Math.round(frames / 3);
  const position = (elapsed / 1000) % (duration + hoverHold * 2);
  return Math.round(Math.max(0, Math.min(1, (position - hoverHold) / duration)) * frames);
}
