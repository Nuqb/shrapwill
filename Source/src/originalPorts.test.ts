import { describe, expect, it } from 'vitest';
import manifest from './features/preview/ported/manifest.json' with { type: 'json' };
import { hasPortedShader, portedShaders } from './features/preview/ported/registry';
import { unavailableOriginal } from './features/preview/ported/availability';

describe('literal transition source ports', () => {
  it('records source hashes and named host adaptations for each imported resource', () => {
    expect(portedShaders.length).toBeGreaterThanOrEqual(100);
    for (const entry of manifest) {
      expect(entry.sourceHash).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.body).toContain('FUNCNAME');
      expect(entry.adaptations.length).toBeGreaterThan(0);
    }
  });
  it('never enables a name-only approximation as an original-code port', () => {
    for (const kind of [
      'warp_zoom_3',
      'local_flip_roll_right',
      'local_wind',
      'local_rectangle_zoom_in',
      'local_fast_motion_blur_right',
      'local_floral_transition_1',
      'blurry_roll_2',
      'warp_zoom',
    ]) {
      expect(hasPortedShader(kind)).toBe(true);
      expect(unavailableOriginal(kind)).toBe(false);
    }
    for (const kind of ['local_flip_up']) {
      expect(hasPortedShader(kind)).toBe(false);
      expect(unavailableOriginal(kind)).toBe(true);
    }
    expect(unavailableOriginal('reveal_8')).toBe(false);
  });
});
