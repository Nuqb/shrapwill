import { describe, expect, it, vi } from 'vitest';
import { emptySnapshot, type Snapshot } from './types';
import { applyDelta, EditorStateStore, type StateDelta } from './services/desktop/stateUpdates';

function full(sequence = 1, sessionId = 'session'): Snapshot {
  return { ...emptySnapshot(), sessionId, sequence };
}
function delta(baseSequence = 1, sequence = 2): StateDelta {
  const snapshot = full();
  const { assets: _assets, tracks: _tracks, ...project } = snapshot.project;
  const {
    project: _project,
    render: _render,
    sequence: _sequence,
    sessionId: _session,
    ...flags
  } = snapshot;
  return {
    sessionId: 'session',
    baseSequence,
    sequence,
    project,
    flags,
    assets: { upsert: [], removed: [] },
    tracks: { upsert: [], removed: [] },
    clips: { upsert: [], removed: [] },
    render: null,
  };
}
describe('ordered Rust editor updates', () => {
  it('accepts save/background changes at the same editing revision and preserves unchanged project references', async () => {
    const store = new EditorStateStore(async () => full());
    const before = store.full(full());
    const change = delta();
    change.flags.dirty = true;
    const after = await store.receive({ kind: 'delta', delta: change });
    expect(after.dirty).toBe(true);
    expect(after.revision).toBe(before.revision);
    expect(after.project).toBe(before.project);
  });
  it('ignores duplicates and delayed updates including old project sessions', async () => {
    const reload = vi.fn(async () => full(3, 'new'));
    const store = new EditorStateStore(reload);
    const latest = store.full(full(3, 'new'));
    expect(await store.receive({ kind: 'delta', delta: delta() })).toBe(latest);
    expect(store.full(full(2))).toBe(latest);
    expect(reload).not.toHaveBeenCalled();
  });
  it('resynchronizes a gap and coalesces concurrent reloads', async () => {
    const reload = vi.fn(async () => full(5));
    const store = new EditorStateStore(reload);
    store.full(full());
    const updates = await Promise.all([
      store.receive({ kind: 'delta', delta: delta(3, 4) }),
      store.receive({ kind: 'delta', delta: delta(4, 5) }),
    ]);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(updates.map((s) => s.sequence)).toEqual([5, 5]);
  });
  it('adds and removes tracks with explicit clip order and retains other tracks', () => {
    const old = full(),
      change = delta();
    change.tracks.upsert.push({ ...old.project.tracks[0], id: 'new', clipIds: [] });
    change.tracks.removed.push('v1');
    change.tracks.order = ['new', 'a1'];
    const after = applyDelta(old, change);
    expect(after.project.tracks.map((t) => t.id)).toEqual(['new', 'a1']);
    expect(after.project.tracks[1]).toBe(old.project.tracks[1]);
  });
  it('recovers an acknowledged but missing event, and rejects a superseded project operation', async () => {
    vi.useFakeTimers();
    try {
      const store = new EditorStateStore(async () => full(2));
      store.full(full());
      const pending = store.waitFor({ sessionId: 'session', updateSequence: 2 });
      await vi.advanceTimersByTimeAsync(250);
      expect((await pending).sequence).toBe(2);
      store.full(full(3, 'other'));
      await expect(store.waitFor({ sessionId: 'session', updateSequence: 2 })).rejects.toThrow(
        'project changed',
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
