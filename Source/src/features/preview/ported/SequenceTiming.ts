export function videoPhase(
  specification: { timing?: string; frameCount?: number },
  phase: number,
  duration: number,
) {
  if (specification.timing !== 'integer-fps') return phase;
  const count = specification.frameCount!;
  const seconds = Math.fround(duration);
  const fps = Math.floor(Math.fround(count / seconds));
  return Math.floor(Math.fround(phase * seconds) * fps + 0.0001) / count;
}
