import { describe, it, expect } from 'vitest';
import {
  actionIds,
  commands,
  defaultBindings,
  fromKeyboard,
  bindingProblem,
  assignBindings,
  conflicts,
  readBindings,
  saveBindings,
  commandFor,
  storageKey,
} from './shortcuts';
const key = (code: string, options: Partial<KeyboardEvent> = {}) =>
  ({
    code,
    key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    isComposing: false,
    getModifierState: () => false,
    ...options,
  }) as KeyboardEvent;
describe('keyboard shortcuts', () => {
  it('adds a separate configurable magnetic toggle without replacing edge snapping', () => {
    const b = defaultBindings();
    expect(commandFor(b, key('KeyM', { shiftKey: true }))).toBe('magnetic_timeline');
    expect(commandFor(b, key('KeyS'))).toBe('snapping');
    const previous = { ...b } as Partial<typeof b>;
    delete previous.magnetic_timeline;
    expect(
      readBindings({ getItem: () => JSON.stringify({ version: 1, bindings: previous }) })
        .magnetic_timeline,
    ).toEqual(['Shift+M']);
  });
  it('has no conflicting defaults', () => {
    const bindings = defaultBindings();
    const all = Object.values(bindings).flat();
    expect(new Set(all).size).toBe(all.length);
    for (const value of all) expect(bindingProblem(value)).toBeNull();
    expect(actionIds.length).toBeGreaterThan(40);
  });
  it('matches selection, scissors, and split as separate commands', () => {
    const b = defaultBindings();
    expect(commandFor(b, key('KeyV'))).toBe('tool_select');
    expect(commandFor(b, key('KeyC'))).toBe('tool_razor');
    expect(commandFor(b, key('KeyB', { ctrlKey: true }))).toBe('split');
  });
  it('supports Ctrl+Alt and Ctrl+Alt+Shift with exact modifiers', () => {
    let b = assignBindings(defaultBindings(), 'tool_select', ['Ctrl+Alt+W', 'Ctrl+Alt+Shift+W']);
    expect(fromKeyboard(key('KeyW', { ctrlKey: true, altKey: true }))).toBe('Ctrl+Alt+W');
    expect(commandFor(b, key('KeyW', { ctrlKey: true, altKey: true }))).toBe('tool_select');
    expect(commandFor(b, key('KeyW', { ctrlKey: true, altKey: true, shiftKey: true }))).toBe(
      'tool_select',
    );
    expect(commandFor(b, key('KeyW', { ctrlKey: true }))).toBeUndefined();
  });
  it('does not confuse Ctrl+Alt with a plain Ctrl command', () => {
    expect(
      commandFor(defaultBindings(), key('KeyS', { ctrlKey: true, altKey: true })),
    ).toBeUndefined();
  });
  it('ignores IME and AltGr typing', () => {
    expect(fromKeyboard(key('KeyW', { isComposing: true }))).toBeNull();
    expect(
      fromKeyboard(
        key('KeyW', { ctrlKey: true, altKey: true, getModifierState: (k) => k === 'AltGraph' }),
      ),
    ).toBeNull();
  });
  it('requires explicit conflict reassignment and preserves unrelated bindings', () => {
    const b = defaultBindings();
    expect(conflicts(b, 'tool_select', ['C'])).toEqual(['tool_razor']);
    expect(() => assignBindings(b, 'tool_select', ['C'])).toThrow();
    const next = assignBindings(b, 'tool_select', ['C'], true);
    expect(next.tool_razor).toEqual([]);
    expect(next.tool_select).toEqual(['C']);
    expect(next.save).toEqual(['Ctrl+S']);
    expect(b.tool_razor).toEqual(['C']);
  });
  it('preserves alternate shortcuts for the same command', () => {
    const b = assignBindings(defaultBindings(), 'tool_razor', ['C', 'Ctrl+Alt+W']);
    expect(b.tool_razor).toEqual(['C', 'Ctrl+Alt+W']);
    expect(commandFor(b, key('KeyW', { ctrlKey: true, altKey: true }))).toBe('tool_razor');
  });
  it('rejects Windows-reserved and navigation-only combinations', () => {
    for (const value of ['Alt+F4', 'Ctrl+Alt+Delete', 'Win+W', 'Tab', 'Escape', 'Enter'])
      expect(bindingProblem(value)).not.toBeNull();
    expect(bindingProblem('Ctrl+Alt+W')).toBeNull();
    expect(bindingProblem('Ctrl+Shift+F12')).toBeNull();
  });
  it('saves and reloads changed and explicitly unassigned shortcuts', () => {
    let value = '';
    const store = {
      getItem: () => value,
      setItem: (k: string, v: string) => {
        expect(k).toBe(storageKey);
        value = v;
      },
    };
    let b = assignBindings(defaultBindings(), 'tool_select', ['Ctrl+Alt+W']);
    b = assignBindings(b, 'tool_razor', []);
    saveBindings(b, store);
    expect(readBindings(store)).toEqual(b);
  });
  it('recovers safely from malformed or ambiguous stored data', () => {
    expect(readBindings({ getItem: () => '{broken' })).toEqual(defaultBindings());
    const b = defaultBindings();
    b.tool_select = ['C'];
    expect(readBindings({ getItem: () => JSON.stringify({ version: 1, bindings: b }) })).toEqual(
      defaultBindings(),
    );
  });
  it('preserves custom bindings when a future command has a conflicting default', () => {
    const b = readBindings({
      getItem: () => JSON.stringify({ version: 1, bindings: { tool_select: ['Ctrl+Alt+V'] } }),
    });
    expect(b.tool_select).toEqual(['Ctrl+Alt+V']);
    expect(b.add_video_track).toEqual([]);
  });
  it('binds punctuation, space, function keys, and numpad keys', () => {
    expect(commandFor(defaultBindings(), key('Space', { key: ' ' }))).toBe('play_pause');
    expect(commandFor(defaultBindings(), key('Equal', { key: '=' }))).toBe('zoom_in');
    expect(commandFor(defaultBindings(), key('NumpadSubtract'))).toBe('zoom_out');
    const b = assignBindings(defaultBindings(), 'settings', ['Ctrl+F12']);
    expect(commandFor(b, key('F12', { ctrlKey: true }))).toBe('settings');
  });
  it('keeps registry defaults immutable when users edit a profile', () => {
    const b = defaultBindings();
    b.tool_select.push('Ctrl+Alt+W');
    expect([...commands.tool_select.defaults]).toEqual(['V']);
  });
});
