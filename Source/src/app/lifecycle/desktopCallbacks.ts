import { call } from '../../services/desktop/client';
import type { DesktopCallbacks, StartupData } from '../../services/desktop/subscriptions';
import type { Job } from '../../types';
import type { LifecycleContext } from './types';

function applyStartup(ctx: LifecycleContext, data: StartupData) {
  ctx.update(data.snapshot);
  ctx.setRecents(data.recents);
  ctx.setRecovery(data.recovery);
  ctx.setEncoders(data.encoders);
  ctx.setReady(true);
}

function applyJob(ctx: LifecycleContext, job: Job) {
  ctx.setJobs((old) => [...old.filter((item) => item.id !== job.id).slice(-7), job]);
  if (job.status !== 'running') {
    ctx.previewJobs.current.get(job.id)?.forEach((id) => ctx.previewPending.current.delete(id));
    ctx.previewJobs.current.delete(job.id);
  }
  if (job.status === 'failed') ctx.notify(job.message || 'Media operation failed');
  if (job.status === 'complete' && job.kind === 'export')
    ctx.notify('Your video has been exported.');
}

async function requestClose(ctx: LifecycleContext) {
  if (ctx.closePending.current) return;
  ctx.closePending.current = true;
  try {
    if (await ctx.safeToLeave(true)) {
      ctx.setPlaying(false);
      await call('close_editor');
    }
  } catch (error) {
    ctx.notify(`Could not close Shrapwill: ${String(error)}`);
  } finally {
    ctx.closePending.current = false;
  }
}

function acceptDrop(ctx: LifecycleContext, paths: string[]) {
  if (paths.length === 1 && paths[0].endsWith('.cutline')) void ctx.openPath(paths[0]);
  else void ctx.importPaths(paths);
}

export function createDesktopCallbacks(ctx: LifecycleContext): DesktopCallbacks {
  return {
    startup: (data) => applyStartup(ctx, data),
    startupFailed: (error) => {
      ctx.notify(String(error));
      ctx.setReady(true);
    },
    project: ctx.update,
    job: (job) => applyJob(ctx, job),
    encoders: ctx.setEncoders,
    close: () => requestClose(ctx),
    drop: (paths) => acceptDrop(ctx, paths),
    failed: (error) => ctx.notify(String(error)),
  };
}
