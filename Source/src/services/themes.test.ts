import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, readTheme, saveTheme, themes, themeStorageKey } from './themes';

afterEach(() => vi.unstubAllGlobals());

describe('local accent preferences', () => {
  it('defaults to orange for missing, unknown, or inaccessible preferences', () => {
    const getItem = vi.fn(() => null as string | null);
    vi.stubGlobal('localStorage', { getItem });
    expect(readTheme()).toBe('orange');
    getItem.mockReturnValue('unknown');
    expect(readTheme()).toBe('orange');
    getItem.mockImplementation(() => {
      throw Error('Storage unavailable');
    });
    expect(readTheme()).toBe('orange');
  });

  it('saves and restores each supported theme without changing other preferences', () => {
    const values = new Map([['shrapwill-shortcuts-v1', 'existing shortcuts']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const setProperty = vi.fn();
    const root = { style: { setProperty }, dataset: { theme: '' } };
    vi.stubGlobal('document', { documentElement: root });
    expect(themes).toHaveLength(10);
    for (const theme of themes) {
      saveTheme(theme.id);
      expect(readTheme()).toBe(theme.id);
      expect(root.dataset.theme).toBe(theme.id);
      expect(setProperty).toHaveBeenLastCalledWith('--accent', theme.accent);
    }
    expect(values.get('shrapwill-shortcuts-v1')).toBe('existing shortcuts');
    expect(values.get(themeStorageKey)).toBe('lime');
  });

  it('leaves the current accent unchanged when saving fails', () => {
    const setProperty = vi.fn();
    vi.stubGlobal('document', { documentElement: { style: { setProperty }, dataset: {} } });
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw Error('Storage full');
      },
    });
    applyTheme('orange');
    expect(() => saveTheme('violet')).toThrow('Storage full');
    expect(setProperty).toHaveBeenCalledTimes(1);
    expect(setProperty).toHaveBeenLastCalledWith('--accent', '#ff9b45');
  });
});
