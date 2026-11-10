export type CurveSegment = { time: number[]; value: number[]; bezier: number[] };
function cubic(p: number, a: number, b: number) {
  return 3 * a * (1 - p) ** 2 * p + 3 * b * (1 - p) * p * p + p ** 3;
}
function segment(curve: CurveSegment, phase: number) {
  const { time, value, bezier } = curve;
  if (phase <= time[0]) return value[0];
  if (phase >= time[1]) return value[1];
  const x = (phase - time[0]) / (time[1] - time[0]);
  let start = 0,
    end = 1;
  while (end - start > 0.0001) {
    const middle = (start + end) * 0.5;
    if (cubic(middle, bezier[0], bezier[2]) > x) end = middle;
    else start = middle;
  }
  return value[0] + (value[1] - value[0]) * cubic((start + end) * 0.5, bezier[1], bezier[3]);
}
export function animationValues(curves: CurveSegment[][], phase: number) {
  const values = curves.map((curve) =>
    segment(curve.find((part) => phase <= part.time[1]) ?? curve.at(-1)!, phase),
  );
  const frame = Math.floor(phase * 47.999996),
    even = frame % 2 === 0;
  values.push(
    segment(
      {
        time: [frame, frame + 1],
        value: even ? [6.666667, 0] : [0, 6.666667],
        bezier: even
          ? [0.166666667, 0.166666667, 0.833333333, 1]
          : [0.166666667, 0, 0.833333333, 0.916666667],
      },
      phase,
    ),
  );
  return values;
}
