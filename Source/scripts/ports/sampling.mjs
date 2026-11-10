// These shaders deliberately collapse one axis at the midpoint in their own
// equations: Vertical Stretch samples the center row; Beam Wipe samples a column.
const intentionalCollapse = new Set(['local_vertical_stretch', 'local_beam_wipe']);

export function sceneVariation(pixels) {
  let horizontal = 0;
  let vertical = 0;
  for (let y = 0; y < 72; y++) {
    for (let x = 0; x < 128; x++) {
      for (let channel = 0; channel < 3; channel++) {
        const value = pixels[(y * 128 + x) * 4 + channel];
        horizontal += Math.abs(value - pixels[y * 128 * 4 + channel]);
        vertical += Math.abs(value - pixels[x * 4 + channel]);
      }
    }
  }
  return { horizontal: horizontal / (128 * 72 * 3), vertical: vertical / (128 * 72 * 3) };
}

export async function auditSceneSampling(programs, render) {
  const results = [];
  for (const kind of programs) {
    const collapsed = [];
    for (let frame = 0; frame <= 60; frame++) {
      const phase = frame / 60;
      const { horizontal, vertical } = sceneVariation(await render(kind, phase * 6));
      const lines = (horizontal < 0.1 && vertical > 5) || (vertical < 0.1 && horizontal > 5);
      const intentional = frame === 30 && intentionalCollapse.has(kind);
      if (lines && !intentional) collapsed.push({ phase, horizontal, vertical });
    }
    results.push({ kind, collapsed });
  }
  return results;
}
