import type { ColorGrade } from '../../types';
export const defaultGrade = (): ColorGrade => ({
  hdrWheels: Array.from({ length: 7 }, () => [0, 0, 0]),
  lutStrength: 1,
  sharpen: 0,
  vignetteSettings: [1, 0, 0.5, 0, 0.5],
  enabled: {},
  secondaryCurves: Array.from({ length: 6 }, () => Array(5).fill(0.5)),
  exposure: 0,
  vibrance: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  hsl: Array.from({ length: 8 }, () => [0, 0, 0]),
  curves: Array.from({ length: 4 }, () => [0, 0.25, 0.5, 0.75, 1]),
  wheels: Array.from({ length: 3 }, () => [0, 0, 0]),
});
const curve = (value: number, points: number[]) => {
  const x = Math.min(1, Math.max(0, value)) * 4;
  const i = Math.min(3, Math.floor(x));
  return points[i] + (points[i + 1] - points[i]) * (x - i);
};
const neutralSecondary = Array.from({ length: 6 }, () => Array(5).fill(0.5));
function neutral(g: ColorGrade) {
  return (
    [g.exposure, g.vibrance, g.highlights, g.shadows, g.whites, g.blacks].every((v) => v === 0) &&
    g.hsl.every((row) => row.every((v) => v === 0)) &&
    g.wheels.every((row) => row.every((v) => v === 0)) &&
    (g.hdrWheels ?? []).every((row) => row.every((v) => v === 0)) &&
    (g.secondaryCurves ?? []).every((row) => row.every((v) => v === 0.5)) &&
    g.curves.every((row) => row.every((v, i) => v === i / 4))
  );
}
export function applyGrade(rgb: number[], g?: ColorGrade) {
  if (!g || neutral(g)) return rgb;
  const l = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722,
    shadow = (1 - l) ** 2,
    highlight = l * l;
  const max = Math.max(...rgb),
    min = Math.min(...rgb),
    delta = max - min;
  const hue =
    delta < 1e-9
      ? 0
      : max === rgb[0]
        ? (((((rgb[1] - rgb[2]) / delta) % 6) + 6) % 6) / 6
        : max === rgb[1]
          ? ((rgb[2] - rgb[0]) / delta + 2) / 6
          : ((rgb[0] - rgb[1]) / delta + 4) / 6;
  const adjustments = [0, 0, 0];
  [0, 30 / 360, 60 / 360, 120 / 360, 180 / 360, 240 / 360, 270 / 360, 300 / 360].forEach(
    (center, i) => {
      const d = Math.abs(hue - center);
      const weight = Math.max(0, 1 - Math.min(d, 1 - d) * 6);
      adjustments.forEach((_, j) => (adjustments[j] += g.hsl[i][j] * weight));
    },
  );
  const secondary = g.secondaryCurves ?? neutralSecondary;
  const saturationInput = max > 1e-9 ? delta / max : 0;
  adjustments[0] += (curve(hue, secondary[1]) - 0.5) * 2;
  adjustments[1] +=
    (curve(hue, secondary[0]) +
      curve(l, secondary[3]) +
      curve(saturationInput, secondary[4]) -
      1.5) *
    2;
  adjustments[2] += (curve(hue, secondary[2]) + curve(saturationInput, secondary[5]) - 1) * 2;
  const angle = adjustments[0] * Math.PI,
    u = Math.cos(angle),
    w = Math.sin(angle);
  const rotated =
    adjustments[0] === 0
      ? rgb
      : [
          (0.299 + 0.701 * u + 0.168 * w) * rgb[0] +
            (0.587 - 0.587 * u + 0.33 * w) * rgb[1] +
            (0.114 - 0.114 * u - 0.497 * w) * rgb[2],
          (0.299 - 0.299 * u - 0.328 * w) * rgb[0] +
            (0.587 + 0.413 * u + 0.035 * w) * rgb[1] +
            (0.114 - 0.114 * u + 0.292 * w) * rgb[2],
          (0.299 - 0.3 * u + 1.25 * w) * rgb[0] +
            (0.587 - 0.588 * u - 1.05 * w) * rgb[1] +
            (0.114 + 0.886 * u - 0.203 * w) * rgb[2],
        ];
  return rgb.map((_, i) => {
    const saturation = 1 + adjustments[1] + g.vibrance * (1 - delta);
    let x = (l + (rotated[i] - l) * saturation + adjustments[2] * 0.25) * 2 ** g.exposure;
    x +=
      g.shadows * shadow * 0.25 +
      g.highlights * highlight * 0.25 +
      g.blacks * shadow ** 2 * 0.25 +
      g.whites * highlight ** 2 * 0.25;
    x +=
      g.wheels[0][i] * shadow * 0.25 +
      g.wheels[1][i] * (1 - shadow - highlight) * 0.25 +
      g.wheels[2][i] * highlight * 0.25;
    const centers = [0, 0.1, 0.25, 0.5, 0.75, 0.9];
    const widths = [0.15, 0.2, 0.3, 0.3, 0.3, 0.2];
    (g.hdrWheels ?? []).forEach((wheel, j) => {
      const weight = j === 6 ? 1 : Math.max(0, 1 - Math.abs(l - centers[j]) / widths[j]);
      x += wheel[i] * weight * 0.25;
    });
    return Math.min(1, Math.max(0, curve(curve(x, g.curves[0]), g.curves[i + 1])));
  });
}
