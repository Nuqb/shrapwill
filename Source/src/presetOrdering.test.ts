import { describe, expect, it } from 'vitest';
import { orderedCategoryItems } from './features/library/presetOrdering';
import { videoEffects, videoEffectCategories } from './features/library/videoEffects';

describe('Filmora video-effect comparison order', () => {
  it('retains Filmora category order including empty categories', () => {
    expect(videoEffectCategories.slice(0, 6).map((group) => group.name)).toEqual([
      'Trending',
      'Annual Highlights',
      'Basic',
      'Zoom',
      'Shake',
      'Object Outline',
    ]);
    expect(videoEffectCategories.find((group) => group.name === 'AI Infographic')).toBeDefined();
  });
  it('uses cached card order within a category and shows each effect once in All', () => {
    const shake = orderedCategoryItems(videoEffects, videoEffectCategories, 'Shake');
    expect(shake.every((entry) => videoEffects.includes(entry))).toBe(true);
    const all = orderedCategoryItems(videoEffects, videoEffectCategories);
    expect(new Set(all.map((entry) => entry.name)).size).toBe(all.length);
    expect(all.length).toBe(videoEffects.length);
    expect(
      orderedCategoryItems(videoEffects, videoEffectCategories, 'Object Outline').every((entry) =>
        videoEffects.includes(entry),
      ),
    ).toBe(true);
  });
});
