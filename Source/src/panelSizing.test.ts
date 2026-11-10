import { describe, it, expect } from 'vitest';
import { fitPanels, resizePanel } from './app/layout/panelSizing';
const layout = { left: 320, right: 280, bottom: 300 };
describe('workspace panel bounds', () => {
  it('allows library growth past the former fixed cap while retaining a usable preview', () => {
    for (const width of [1354, 1908]) {
      const bounds = { width, height: 900, inspector: false };
      const enlarged = resizePanel(layout, 'left', 10000, bounds);
      expect(enlarged.left).toBeGreaterThan(480);
      expect(width - enlarged.left - 6).toBe(320);
      expect(enlarged.right).toBe(280);
    }
  });
  it('fits saved wide panels when the inspector appears or the window shrinks', () => {
    const fitted = fitPanels(
      { left: 1600, right: 1000, bottom: 900 },
      { width: 1088, height: 620, inspector: true },
    );
    expect(fitted.left + fitted.right + 12 + 320).toBeLessThanOrEqual(1088);
    expect(fitted.left).toBeGreaterThanOrEqual(280);
    expect(fitted.right).toBeGreaterThanOrEqual(240);
    expect(620 - fitted.bottom - 6).toBe(200);
  });
  it('resizes from the visible size when saved preferences exceed the available space', () => {
    const stored = { ...layout, left: 1600 };
    expect(
      resizePanel(stored, 'left', -100, { width: 1354, height: 900, inspector: true }).left,
    ).toBe(642);
    expect(
      resizePanel(layout, 'bottom', -10000, { width: 1354, height: 900, inspector: false }).bottom,
    ).toBe(150);
  });
});
