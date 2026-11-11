export const clampUnit = (value: number) => Math.max(0, Math.min(1, value));
export function wheelColor(x: number, y: number): number[] {
  const amount = Math.min(1, Math.hypot(x, y));
  const hue = (Math.atan2(-y, x) / (Math.PI * 2) + 0.75) % 1;
  const component = (offset: number) =>
    Math.max(0, Math.min(1, Math.abs(((hue * 6 + offset) % 6) - 3) - 1)) * amount;
  const rgb = [component(0), component(4), component(2)];
  const mean = rgb.reduce((sum, v) => sum + v, 0) / 3;
  return rgb.map((v) => v - mean);
}
export function wheelPosition(rgb: number[]) {
  const low = Math.min(...rgb),
    high = Math.max(...rgb),
    span = high - low;
  if (span < 0.0001) return [0, 0];
  const hue =
    high === rgb[0]
      ? ((rgb[1] - rgb[2]) / span + 6) % 6
      : high === rgb[1]
        ? (rgb[2] - rgb[0]) / span + 2
        : (rgb[0] - rgb[1]) / span + 4;
  const angle = (hue / 6 + 0.25) * Math.PI * 2;
  return [Math.cos(angle) * Math.min(1, span), -Math.sin(angle) * Math.min(1, span)];
}
