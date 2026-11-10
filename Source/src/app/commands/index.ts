import { isRenderedSource } from '../../types';
import { type ActionId } from '../../shortcuts';
import type { CommandContext } from './types';
import { fileHandlers } from './file';
import { editingHandlers } from './editing';
import { playbackHandlers } from './playback';
import { timelineHandlers } from './timeline';
import { workspaceHandlers } from './workspace';
import { sourcePlayback } from '../../features/preview/sourcePlayback';
const handlers = {
  ...fileHandlers,
  ...editingHandlers,
  ...playbackHandlers,
  ...timelineHandlers,
  ...workspaceHandlers,
};
export function createActionDispatcher(ctx: CommandContext) {
  return (id: ActionId) => {
    ctx.setMenu('');
    if (isRenderedSource(ctx.source) && sourcePlayback(ctx.source, id)) {
      ctx.setSource((source) =>
        isRenderedSource(source) ? (sourcePlayback(source, id) ?? source) : source,
      );
      return;
    }
    handlers[id](ctx);
  };
}
