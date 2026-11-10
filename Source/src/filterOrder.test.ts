import { describe, expect, it } from 'vitest';
import { filterPresets } from './features/library/presets';
import { filterCategoryOrder } from './features/library/filterOrder';

describe('Filmora filter comparison order', () => {
  it('keeps the reset first and follows the cached Basic sequence', () => {
    expect(filterPresets[0].name).toBe('Original');
    const basic = filterPresets.filter((entry) => entry.category === 'Basic');
    expect(basic.slice(0, 4).map((entry) => entry.name)).toEqual([
      'Sunny Days',
      'Teal Orange',
      'B&W Style',
      'Aura Contrast',
    ]);
  });
  it('matches Filmora category navigation before local-only groups', () => {
    expect(filterCategoryOrder(['Essentials', 'Retro', 'Basic', 'Cinematic', 'Mono'])).toEqual([
      'Basic',
      'Mono',
      'Cinematic',
      'Retro',
      'Essentials',
    ]);
  });
});
