import { useEffect } from 'react';
import { call, desktop } from '../../services/desktop/client';
import { useDesktopEvents } from './useDesktopEvents';
import { useEditorKeyboard } from './useEditorKeyboard';
import type { LifecycleContext } from './types';
function useRecoveryAutosave(ctx: LifecycleContext) {
  const { notify } = ctx;
  useEffect(() => {
    const timer = setInterval(() => {
      if (desktop) void call('autosave').catch((error) => notify(`Recovery save failed: ${error}`));
    }, 30000);
    return () => clearInterval(timer);
  }, [notify]);
}
function useEditorPersistence(ctx: LifecycleContext) {
  const { layout, snap } = ctx;
  useEffect(() => {
    localStorage.setItem('cutline-layout', JSON.stringify(layout));
  }, [layout]);
  useEffect(() => {
    document.title = `${snap.dirty ? '• ' : ''}${snap.project.name} — Shrapwill`;
  }, [snap.dirty, snap.project.name]);
}
export function useEditorLifecycle(ctx: LifecycleContext) {
  useDesktopEvents(ctx);
  useRecoveryAutosave(ctx);
  useEditorPersistence(ctx);
  useEditorKeyboard(ctx);
}
