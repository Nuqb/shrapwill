import { useEffect } from 'react';
import { desktop } from '../../services/desktop/client';
import { subscribeDesktop } from '../../services/desktop/subscriptions';
import { createDesktopCallbacks } from './desktopCallbacks';
import type { LifecycleContext } from './types';

export function useDesktopEvents(ctx: LifecycleContext) {
  const { update, notify, safeToLeave, openPath, importPaths } = ctx;
  useEffect(() => {
    if (!desktop) {
      ctx.setReady(true);
      return;
    }
    return subscribeDesktop(createDesktopCallbacks(ctx));
  }, [update, notify, safeToLeave, openPath, importPaths]);
}
