import { describe, expect, it, vi } from 'vitest';
import {
  AppUpdateService,
  type UpdateBackend,
  type UpdateCheck,
} from './services/desktop/appUpdates';
const available: UpdateCheck = {
  currentVersion: '1.0.0',
  mode: 'portable',
  feedAvailable: true,
  available: { version: '1.1.0', notes: 'Release notes', bytes: 1000 },
};
function backend(): UpdateBackend {
  return {
    check: vi.fn(async () => available),
    download: vi.fn(async () => {}),
    install: vi.fn(async () => 'portable' as const),
    restart: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
  };
}
describe('application update lifecycle', () => {
  it('checks once per startup and never downloads or installs automatically', async () => {
    const api = backend(),
      updates = new AppUpdateService(api);
    await Promise.all([updates.check(true), updates.check(true)]);
    await updates.check(true);
    expect(api.check).toHaveBeenCalledTimes(1);
    expect(api.download).not.toHaveBeenCalled();
    expect(api.install).not.toHaveBeenCalled();
    expect(updates.snapshot().phase).toBe('available');
  });
  it('requires a verified download before installation and keeps portable restart separate', async () => {
    const api = backend(),
      updates = new AppUpdateService(api);
    await updates.install();
    expect(api.install).not.toHaveBeenCalled();
    await updates.check();
    await updates.download();
    expect(updates.snapshot().phase).toBe('ready');
    await updates.install();
    expect(updates.snapshot().phase).toBe('installed');
    expect(api.restart).not.toHaveBeenCalled();
    await updates.restart(true);
    expect(api.restart).toHaveBeenCalledWith(true);
  });
  it('ignores stale progress and supports a failed-download retry', async () => {
    const api = backend();
    vi.mocked(api.download).mockRejectedValueOnce(Error('Offline'));
    const updates = new AppUpdateService(api);
    await updates.check();
    await updates.download();
    updates.progress({ version: 'old', downloaded: 999, total: 1000 });
    expect(updates.snapshot().phase).toBe('error');
    expect(updates.snapshot().downloaded).toBe(0);
    await updates.download();
    expect(updates.snapshot().phase).toBe('ready');
  });
  it('retains the downloaded update after an installation error', async () => {
    const api = backend();
    vi.mocked(api.install).mockRejectedValue(Error('Media is still exporting'));
    const updates = new AppUpdateService(api);
    await updates.check();
    await updates.download();
    await updates.install(true);
    expect(updates.snapshot().phase).toBe('ready');
    expect(updates.snapshot().error).toContain('exporting');
    await updates.check();
    expect(api.check).toHaveBeenCalledTimes(1);
  });
  it('handles missing feeds and offline checks without installing anything', async () => {
    const api = backend();
    vi.mocked(api.check)
      .mockResolvedValueOnce({ ...available, available: null, feedAvailable: false })
      .mockRejectedValueOnce(Error('Offline'));
    const updates = new AppUpdateService(api);
    await updates.check();
    expect(updates.snapshot().phase).toBe('unpublished');
    await updates.check();
    expect(updates.snapshot().phase).toBe('error');
    expect(api.install).not.toHaveBeenCalled();
  });
});
