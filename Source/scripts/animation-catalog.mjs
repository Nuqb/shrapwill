// Portable transform values only. Compiled host animations require a different renderer.
export function animationCatalog(source) {
  const portable = source.motions.filter(
    (p) => !p.animation && Object.keys(p.curves).length && p.scene === 'animation_scene_in',
  );
  const presets = [...source.keyframes.map((p) => ({ ...p, scene: 'keyframe' })), ...portable].map(
    (p) => ({ id: p.id, name: p.name, scene: p.scene, curves: normalized(p.curves) }),
  );
  for (const [original, name, key] of [
    ['Slide Right', 'Slide Left', 'Position_x'],
    ['Slide Up', 'Slide Down', 'Position_y'],
  ]) {
    if (presets.some((p) => p.scene === 'keyframe' && p.name === name)) continue;
    const p = structuredClone(presets.find((p) => p.scene === 'keyframe' && p.name === original));
    p.id = 'local-' + name.toLowerCase().replaceAll(' ', '-');
    p.name = name;
    p.curves[key] = p.curves[key].map(([t, v]) => [t, 1 - v]);
    presets.push(p);
  }
  const fade = structuredClone(presets.find((p) => p.scene === 'keyframe' && p.name === 'Fade in'));
  presets.push({ ...fade, id: 'local-motion-fade', scene: 'animation_scene_in', name: 'Fade In' });
  return [...presets, ...presets.filter((p) => p.scene === 'animation_scene_in').map(outgoing)];
}
function normalized(curves) {
  return Object.fromEntries(
    Object.entries(curves).map(([key, points]) => {
      const end = Math.max(...points.map((p) => p.time), 1);
      return [key, points.map((p) => [p.time / end, p.value])];
    }),
  );
}
function outgoing(preset) {
  const curves = Object.fromEntries(
    Object.entries(preset.curves).map(([key, points]) => {
      const base = points.at(-1)[1];
      const values = points
        .map(([t, v]) => [
          1 - t,
          key.startsWith('Scale') || key === 'Opacity'
            ? (v / Math.max(0.001, base)) * 100
            : key.startsWith('Position')
              ? v - base + 0.5
              : v - base,
        ])
        .reverse();
      return [key, values];
    }),
  );
  return { ...preset, id: 'local-out-' + preset.id, scene: 'animation_scene_out', curves };
}
