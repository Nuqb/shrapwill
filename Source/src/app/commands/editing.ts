import { type ActionId } from '../../shortcuts';
import type { CommandContext, CommandHandlers } from './types';
export const editingHandlers = {
  undo: (ctx: CommandContext) => {
    const { history } = ctx;
    void history('undo');
  },
  redo: (ctx: CommandContext) => {
    const { history } = ctx;
    void history('redo');
  },
  copy: (ctx: CommandContext) => {
    const { clipboardAction } = ctx;
    const id: ActionId = 'copy';
    void clipboardAction(id);
  },
  cut: (ctx: CommandContext) => {
    const { clipboardAction } = ctx;
    const id: ActionId = 'cut';
    void clipboardAction(id);
  },
  paste: (ctx: CommandContext) => {
    const { clipboardAction } = ctx;
    const id: ActionId = 'paste';
    void clipboardAction(id);
  },
  duplicate: (ctx: CommandContext) => {
    const { clipboardAction } = ctx;
    const id: ActionId = 'duplicate';
    void clipboardAction(id);
  },
  select_all: (ctx: CommandContext) => {
    const { selectedTracks, selectClips, selectTracks, p } = ctx;
    if (selectedTracks.length) selectTracks(p.tracks.filter((t) => !t.locked).map((t) => t.id));
    else selectClips(p.tracks.filter((t) => !t.locked).flatMap((t) => t.clips.map((c) => c.id)));
  },
  deselect: (ctx: CommandContext) => {
    const { selectClips } = ctx;
    selectClips([]);
  },
  split: (ctx: CommandContext) => {
    const { split } = ctx;
    split();
  },
  delete: (ctx: CommandContext) => {
    const { remove } = ctx;
    remove(false);
  },
  ripple_delete: (ctx: CommandContext) => {
    const { remove } = ctx;
    remove(true);
  },
  detach_audio: (ctx: CommandContext) => {
    const { detach } = ctx;
    detach();
  },
  trim_start: (ctx: CommandContext) => trimToPlayhead(ctx, 'left'),
  trim_end: (ctx: CommandContext) => trimToPlayhead(ctx, 'right'),
} satisfies CommandHandlers;

function trimToPlayhead(ctx: CommandContext, edge: 'left' | 'right') {
  const { selectedClip, frame, edit, notify } = ctx;
  if (
    !selectedClip ||
    frame <= selectedClip.start ||
    frame >= selectedClip.start + selectedClip.duration
  ) {
    notify('Place the playhead inside a selected clip to trim.');
    return;
  }
  void edit({ type: 'trim', id: selectedClip.id, edge, frame });
}
