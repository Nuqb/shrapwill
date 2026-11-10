export type PanelLayout = { left: number; right: number; bottom: number };
export type PanelBounds = { width: number; height: number; inspector: boolean };
export type PanelSide = keyof PanelLayout;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function fitPanels(layout: PanelLayout, bounds: PanelBounds): PanelLayout {
  const right = bounds.inspector ? clamp(layout.right, 240, Math.max(240, bounds.width - 612)) : 0;
  return {
    left: clamp(
      layout.left,
      280,
      Math.max(280, bounds.width - 320 - (bounds.inspector ? right + 12 : 6)),
    ),
    right,
    bottom: clamp(layout.bottom, 150, Math.max(150, bounds.height - 206)),
  };
}
export function resizePanel(
  layout: PanelLayout,
  side: PanelSide,
  delta: number,
  bounds: PanelBounds,
): PanelLayout {
  const current = fitPanels(layout, bounds);
  const max =
    side === 'bottom'
      ? bounds.height - 206
      : bounds.width -
        320 -
        (side === 'left' ? (bounds.inspector ? current.right + 12 : 6) : current.left + 12);
  const minimum = side === 'left' ? 280 : side === 'right' ? 240 : 150;
  return { ...layout, [side]: clamp(current[side] + delta, minimum, Math.max(minimum, max)) };
}
