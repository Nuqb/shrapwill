import { useEffect } from 'react';
import { commands, commandFor, isTextEntry } from '../../shortcuts';
import type { LifecycleContext } from './types';

function cancelEditorSelection(ctx: LifecycleContext) {
  ctx.setMenu('');
  ctx.setNewOpen(false);
  ctx.setExportOpen(false);
  ctx.setSource(null);
  ctx.setSelected([]);
  ctx.setSelectedTracks([]);
  ctx.setTool('select');
}

function handleKey(ctx: LifecycleContext, event: KeyboardEvent) {
  if (event.defaultPrevented || event.isComposing) return;
  const state = ctx.keyboardState.current;
  if (state.settingsOpen || state.unsavedOpen || state.projectInfoOpen) return;
  if (event.key === 'Escape' && !isTextEntry(event.target)) {
    event.preventDefault();
    cancelEditorSelection(ctx);
    return;
  }
  if (state.newOpen || state.exportOpen || isTextEntry(event.target)) return;
  const action = commandFor(state.bindings, event);
  if (!action || (state.launcher && commands[action].scope === 'editor')) return;
  event.preventDefault();
  const definition = commands[action];
  if (event.repeat && !('repeat' in definition && definition.repeat)) return;
  ctx.dispatch.current(action);
}

export function useEditorKeyboard(ctx: LifecycleContext) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => handleKey(ctx, event);
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
}
